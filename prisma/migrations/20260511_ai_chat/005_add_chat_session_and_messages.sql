-- AI 对话会话表
CREATE TABLE chat_session (
    id VARCHAR(36) PRIMARY KEY,
    child_id VARCHAR(36) NOT NULL,
    subject VARCHAR(50),
    summary VARCHAR(255) NOT NULL DEFAULT '新对话',
    message_count INT NOT NULL DEFAULT 0,
    last_message_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_child_id (child_id),
    INDEX idx_last_message (last_message_at)
);

-- AI 对话消息表
CREATE TABLE chat_message (
    id VARCHAR(36) PRIMARY KEY,
    session_id VARCHAR(36) NOT NULL,
    role ENUM('user', 'assistant', 'system') NOT NULL,
    content TEXT NOT NULL,
    tokens INT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_session_id (session_id),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (session_id) REFERENCES chat_session(id) ON DELETE CASCADE
);
