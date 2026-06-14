# 图书管理系统 (Experiment 4)

## 🛠 技术栈
- **Frontend**: React 18 + Vite + WindiCSS
- **Backend**: Spring Boot 2.7 (JDK 17) + MyBatis + MySQL Driver
- **Database**: MySQL 8.0

## 🚀 启动指南 (How to Run)
1. 确保 Docker Desktop 已启动。
2. 在根目录执行：
   ```bash
   docker compose up --build
   ```
3. 等待容器启动完成（首次启动需要下载依赖，可能需要几分钟）。

## 🔗 服务地址 (Services)
- **Frontend**: [http://localhost:3526](http://localhost:3526)
- **Backend API**: [http://localhost:8526/api/books](http://localhost:8526/api/books)
- **Database**: `localhost:33526` (user: `root` / pass: `root`, DB: `book_management`)

## 🧪 测试账号
- **Admin**: `admin` / `123456`


---

## 实验内容完成情况
1. [x] SSM 框架整合 (Spring Boot + MyBatis)
2. [x] 数据库表结构设计 (`book`)
3. [x] RESTful 接口实现 (GET, POST, PUT, DELETE)
4. [x] 全局异常处理 / 统一返回封装
5. [x] 前端 React页面交互
6. [x] Docker 容器化部署

## 截图
(请在此处自行添加实验运行截图)
