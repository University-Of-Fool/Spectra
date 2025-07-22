use rand::Rng;

pub fn random_string(length: usize) -> String {
    let charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*().-";
    let mut rng = rand::rng();
    let mut s = String::new();
    for _ in 0..length {
        let c = rng.random_range(0..charset.len());
        s.push(charset.chars().nth(c).unwrap());
    }
    s
}
pub fn random_password() -> String {
    random_string(16)
}
