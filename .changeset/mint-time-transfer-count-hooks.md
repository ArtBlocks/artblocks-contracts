---
"@artblocks/contracts": minor
---

Add `MintTimeAndTransferCountHooks`, a shared reference combined hook that records mint timestamp and post-mint transfer count, injects them (plus live seconds since mint) into PostParams, and optionally writes `transferCount` as an Address-auth PMP so transfers emit `TokenParamsConfigured`.
