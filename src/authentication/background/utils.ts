import {
    UserPlan,
    Claims,
    UserFeature,
} from '@worldbrain/memex-common/lib/subscriptions/types'

export const SUBSCRIPTION_GRACE_MS = 1000 * 60 * 60

export function hasSubscribedBefore(claims: Claims): boolean {
    return (
        claims.lastSubscribed != null ||
        (claims.subscriptions != null &&
            Object.keys(claims.subscriptions).length > 0)
    )
}

export function hasValidPlan(claims: Claims, plan: UserPlan): boolean {
    return checkValidPlan(claims, plan).valid
}

export function getAuthorizedFeatures(claims: Claims): UserFeature[] {
    const features = [] as UserFeature[]

    if (claims == null || claims.features == null) {
        return features
    }

    Object.keys(claims.features).forEach((feature: UserFeature) => {
        const expiry = claims.features[feature].expiry
        if (
            expiry != null &&
            expiry + SUBSCRIPTION_GRACE_MS > new Date().getUTCMilliseconds()
        ) {
            features.push(feature)
        }
    })

    return features
}

export function checkValidPlan(
    claims: Claims,
    plan: UserPlan,
): { valid: true } | { valid: false; reason: 'not-present' | 'expired' } {
    const subscriptionExpiry = getSubscriptionExpirationTimestamp(claims, plan)

    if (!subscriptionExpiry) {
        return { valid: false, reason: 'not-present' }
    }

    if (Date.now() >= subscriptionExpiry + SUBSCRIPTION_GRACE_MS) {
        return { valid: false, reason: 'expired' }
    }

    return { valid: true }
}

export function getSubscriptionExpirationTimestamp(
    claims: Claims,
    plan: UserPlan,
): number | null {
    const isPresent =
        claims != null &&
        claims.subscriptions != null &&
        claims.subscriptions[plan] != null
    return isPresent ? claims.subscriptions[plan].expiry : null
}
