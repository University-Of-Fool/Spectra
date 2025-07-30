use rand::Rng;

pub fn random_string(length: usize, charset: Option<&str>) -> String {
    let charset = charset
        .unwrap_or("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*().-");
    let mut rng = rand::rng();
    let mut s = String::new();
    for _ in 0..length {
        let c = rng.random_range(0..charset.len());
        s.push(charset.chars().nth(c).unwrap());
    }
    s
}
pub fn random_password() -> String {
    random_string(16, None)
}

pub async fn check_turnstile(
    secret_token: &str,
    token: &str,
) -> anyhow::Result<(bool, Vec<String>)> {
    let client = reqwest::Client::new();
    let res = client
        .post("https://challenges.cloudflare.com/turnstile/v0/siteverify")
        .form(&[("secret", secret_token), ("response", token)])
        .send()
        .await?;
    let body = res.json::<serde_json::Value>().await?;
    Ok((
        body["success"].as_bool().unwrap_or(false),
        body["error-codes"]
            .as_array()
            .unwrap_or(&vec![])
            .iter()
            .map(|x| x.as_str().unwrap_or("").to_string())
            .collect(),
    ))
}
