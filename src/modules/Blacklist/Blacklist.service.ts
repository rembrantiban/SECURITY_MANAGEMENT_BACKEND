import { Pool, PoolClient } from "pg";

type Queryable = Pool | PoolClient;

export type VisitorName = {
    firstName: string;
    middleName: string | null;
    lastName: string;
};

export type BlacklistMatch = {
    blacklist_id: number;
    name: string;
    reason: string;
    since: string;
};

/**
 * Normalizes raw request input into a trimmed visitor name.
 * An empty middle name is treated as absent.
 */
export const toVisitorName = (
    first_name: unknown,
    middle_name: unknown,
    last_name: unknown
): VisitorName => ({
    firstName: typeof first_name === "string" ? first_name.trim() : "",
    middleName:
        typeof middle_name === "string" && middle_name.trim() !== ""
            ? middle_name.trim()
            : null,
    lastName: typeof last_name === "string" ? last_name.trim() : "",
});

/**
 * Blacklist screening.
 *
 * A visitor matches when an active blacklist entry matches on
 * first name + last name (case-insensitive, whitespace-trimmed).
 * When BOTH the visitor and the blacklist entry carry a middle name,
 * that must match too — otherwise the first + last match still stands,
 * so a middle name can't be added or dropped to slip past the list.
 * The most specific match (middle name included) is preferred.
 */
export const findBlacklistMatch = async (
    db: Queryable,
    { firstName, middleName, lastName }: VisitorName
): Promise<BlacklistMatch | null> => {
    const result = await db.query(
        `
        SELECT
            blacklist_id,
            first_name,
            middle_name,
            last_name,
            reason,
            created_at
        FROM visitor_blacklist
        WHERE
            is_active = true
            AND LOWER(TRIM(first_name)) = LOWER($1)
            AND LOWER(TRIM(last_name)) = LOWER($2)
            AND (
                middle_name IS NULL
                OR TRIM(middle_name) = ''
                OR $3::text IS NULL
                OR LOWER(TRIM(middle_name)) = LOWER($3)
            )
        ORDER BY
            CASE
                WHEN $3::text IS NOT NULL
                    AND LOWER(TRIM(middle_name)) = LOWER($3)
                THEN 0
                ELSE 1
            END,
            created_at DESC
        LIMIT 1
        `,
        [firstName, lastName, middleName]
    );

    if (result.rows.length === 0) return null;

    const match = result.rows[0];

    return {
        blacklist_id: match.blacklist_id,
        name: [match.first_name, match.middle_name, match.last_name]
            .filter(Boolean)
            .join(" "),
        reason: match.reason,
        since: match.created_at,
    };
};
