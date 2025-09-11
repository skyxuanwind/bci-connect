-- 創建email_verifications資料表 (PostgreSQL)
CREATE TABLE IF NOT EXISTS email_verifications (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  verification_code VARCHAR(6) NOT NULL,
  name VARCHAR(255) NOT NULL,
  is_verified BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 創建索引
CREATE UNIQUE INDEX IF NOT EXISTS unique_email_verification ON email_verifications (email);
CREATE INDEX IF NOT EXISTS idx_email_code ON email_verifications (email, verification_code);
CREATE INDEX IF NOT EXISTS idx_expires_at ON email_verifications (expires_at);

-- 添加註釋
COMMENT ON TABLE email_verifications IS 'Email驗證碼表，用於註冊時的Email驗證';
COMMENT ON COLUMN email_verifications.email IS '用戶Email地址';
COMMENT ON COLUMN email_verifications.verification_code IS '6位數驗證碼';
COMMENT ON COLUMN email_verifications.name IS '用戶姓名';
COMMENT ON COLUMN email_verifications.is_verified IS '是否已驗證';
COMMENT ON COLUMN email_verifications.expires_at IS '驗證碼過期時間';

-- 創建自動更新updated_at的觸發器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_email_verifications_updated_at
    BEFORE UPDATE ON email_verifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();