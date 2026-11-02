# Storage options for worldwide Argus communities

Research checked November 2, 2026. This is a design recommendation, not a deployed
storage integration or a promise of perpetual free capacity.

## What “free unlimited” actually offers

Telegram explicitly advertises unlimited aggregate cloud storage, with files up
to 2 GB on free accounts and 4 GB with Premium. This is a messaging product's
storage offer, not a verified unlimited object-storage or database service for
Argus. Cloud chats are not end-to-end encrypted. Account inactivity can delete
cloud data (18 months by default, configurable). An independent recoverable copy
is therefore necessary for important data. See the official
[FAQ](https://telegram.org/faq) and [Premium FAQ](https://telegram.org/faq_premium/).

Integration limits differ from the consumer app: the hosted Bot API downloads
files up to 20 MB and ordinary multipart uploads allow 50 MB for general files.
A self-hosted Local Bot API Server permits downloads without that size limit
and uploads up to 2000 MB, but running it adds infrastructure cost. Never expose
bot-token download URLs to the browser or treat a bot's file identifier as an
access-control policy. [Official Bot API](https://core.telegram.org/bots/api).

| Option                 | Checked free offer                                                                                      | Unlimited?                                    | Appropriate role                                                                                                                                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Telegram               | Advertised unlimited aggregate cloud storage; 2 GB per file                                             | Aggregate claim, with account/API constraints | Optional user-authorized extra backup of client-encrypted exports, subject to provider terms; not the sole evidence store                                                                                |
| Google Drive           | 15 GB shared with Gmail and Photos                                                                      | No                                            | User-controlled documents/export destination; [official quota](https://support.google.com/drive/answer/6374270)                                                                                          |
| OneDrive               | 5 GB shared Microsoft cloud allowance                                                                   | No                                            | User-controlled exports; [official quota](https://support.microsoft.com/en-us/onedrive/microsoft-storage-faqs)                                                                                           |
| Proton Drive           | Up to 5 GB on the free plan                                                                             | No                                            | Personal private files; [official plan](https://proton.me/support/increase-storage-space)                                                                                                                |
| Dropbox Basic          | 2 GB starting storage                                                                                   | No                                            | Small exports; [official quota](https://help.dropbox.com/storage-space/get-more-space)                                                                                                                   |
| pCloud Basic           | Up to 10 GB unlocked through tasks, with referral bonuses described separately                          | No                                            | Personal exports; [official conditions](https://help.pcloud.com/article/referral-program)                                                                                                                |
| TeraBox                | Advertises up to 1 TB free                                                                              | No                                            | Large free allowance, not an unlimited claim; current eligibility, transfer limits, privacy, and application-use terms need further review before integration; [official site](https://www.terabox.com/) |
| Supabase Free          | 500 MB database, 1 GB file storage, 5 GB egress; inactive projects can pause                            | No                                            | Small backend pilot; [official pricing](https://supabase.com/pricing)                                                                                                                                    |
| Cloudflare R2 Standard | 10 GB-month storage, 1 million Class A and 10 million Class B operations monthly; direct egress is free | No                                            | Application object storage with metered growth; [official pricing](https://developers.cloudflare.com/r2/pricing/)                                                                                        |

MEGA's current primary pricing/help pages could not be retrieved in this review;
do not assume older “20 GB” listings apply to every new account or region.
Backblaze offers paid unlimited personal-computer backup, which is a different
product from a free application storage backend.
[Backblaze official offering](https://www.backblaze.com/cloud-backup/personal).

I did not verify a service guaranteeing free, unlimited, durable application
storage with the access controls and recovery requirements needed for private
civic evidence. Referral bonuses, trials, “unlimited users,” and unlimited
bandwidth are not unlimited stored bytes.

## A buildable starting architecture

Reuse Purulia's existing Supabase/Postgres pattern for structured records,
moderation, ownership, and authorization. Keep media identities separate from
civic identities. Keep private files in a private object store; serve approved
public derivatives separately. R2 is a candidate for a new object-store adapter,
not a reason to move the existing evidence store without migration proof.

For a small pilot, existing free allowances can be sufficient. As an illustrative
capacity calculation, 20,000 images averaging 500 KB occupy about 10 GB before
metadata, thumbnails, versions, and backup copies. That is not a user-count or
cost forecast. Compress safe derivatives, limit uploads, deduplicate by content
hash, and define retention with user-visible deletion and export. Preserve
original evidence only where necessary and authorized; do not alter an original
and then claim it is the original record.

R2 Standard storage beyond its free allowance is currently $0.015 per GB-month,
with separate operation charges. For example, 100 GB held for a full month is
about $1.35 for the 90 billable GB-months alone. This excludes requests, database,
compute, backups, taxes, and other services; free egress does not make the whole
application free. [R2 rates](https://developers.cloudflare.com/r2/pricing/).

Put provider operations behind a small server-side storage interface (upload,
read authorization, delete, checksum verification, export). Separate community
tenants, restrict private objects, use short-lived authorized downloads, and
never place service keys in the client. Replicate backups into an independently
controlled destination and test restoration. Encryption alone does not solve
availability, metadata privacy, or account loss; preserve a key-recovery plan.

Start with quotas and a spending plan, then fund growth through community or
institutional hosting, grants, sponsorship, donations, or a sustainable paid
service model. Worldwide software need not store a copy of all worldwide data:
reference licensed public sources and fetch only what users request. A future
commercial geocoding deployment also needs an appropriately licensed provider.

## Current PR boundary

The Community integration reads public data and keeps drafts temporarily in
memory. It does not create accounts, upload reports, copy private evidence,
open buckets, enroll billing, deploy a bot, or move existing Supabase data.
Persistent worldwide reporting and storage require a separately reviewed backend
implementation with tenancy, moderation, jurisdiction, consent, migration, and
restore tests. Telegram is not silently added as a shared data sink.
