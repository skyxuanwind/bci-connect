-- 專案計劃勾選狀態表創建腳本
-- 執行時間: 2024-01-01

-- 創建專案計劃勾選狀態表
CREATE TABLE IF NOT EXISTS project_plan_checklist_states (
    id SERIAL PRIMARY KEY,
    member_id INTEGER NOT NULL,
    card_id VARCHAR(100) NOT NULL,
    item_id VARCHAR(100) NOT NULL,
    is_checked BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- 確保每個會員的每個項目只有一個狀態記錄
    UNIQUE(member_id, card_id, item_id)
);

-- 創建索引以提升查詢性能
CREATE INDEX IF NOT EXISTS idx_project_plan_checklist_member_id ON project_plan_checklist_states(member_id);
CREATE INDEX IF NOT EXISTS idx_project_plan_checklist_card_id ON project_plan_checklist_states(member_id, card_id);
CREATE INDEX IF NOT EXISTS idx_project_plan_checklist_updated_at ON project_plan_checklist_states(updated_at);

-- 創建觸發器自動更新 updated_at 字段
CREATE OR REPLACE FUNCTION update_project_plan_checklist_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_project_plan_checklist_states_updated_at ON project_plan_checklist_states;
CREATE TRIGGER update_project_plan_checklist_states_updated_at 
    BEFORE UPDATE ON project_plan_checklist_states 
    FOR EACH ROW EXECUTE FUNCTION update_project_plan_checklist_updated_at();

-- 添加註釋
COMMENT ON TABLE project_plan_checklist_states IS '專案計劃勾選狀態表，記錄每個會員的任務完成狀態';
COMMENT ON COLUMN project_plan_checklist_states.member_id IS '會員ID';
COMMENT ON COLUMN project_plan_checklist_states.card_id IS '卡片ID（對應前端的cardId）';
COMMENT ON COLUMN project_plan_checklist_states.item_id IS '項目ID（對應前端的itemId）';
COMMENT ON COLUMN project_plan_checklist_states.is_checked IS '是否已勾選完成';