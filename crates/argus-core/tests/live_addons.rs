//! Hits real public addons. Run with `cargo test -- --ignored` before releases.

use argus_core::sources::addon::AddonClient;

#[tokio::test]
#[ignore = "network"]
async fn cinemeta_end_to_end() {
    let client = AddonClient::new(argus_core::http_client());
    let addon = client
        .install("https://v3-cinemeta.strem.io/manifest.json")
        .await
        .unwrap();
    assert_eq!(addon.manifest.id, "com.linvo.cinemeta");

    let top = client.catalog(&addon, "movie", "top", &[]).await.unwrap();
    assert!(!top.is_empty());

    let found = client
        .search(std::slice::from_ref(&addon), "the matrix")
        .await;
    assert!(found.iter().any(|m| m.id == "tt0133093"));

    let meta = client
        .meta(std::slice::from_ref(&addon), "series", "tt0903747")
        .await
        .unwrap();
    assert!(meta.videos.len() > 50, "Breaking Bad episodes");
}
