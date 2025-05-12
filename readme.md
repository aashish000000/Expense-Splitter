Acheived
        Create/ register a user in the backend
        Login the user
        Create a group button to make group with unique id so other can join
        Other multiple people can join the group
        Add the group expense so that It will be divided evenly among the group member
        bcrypt
        patch
        Clear my due/ bill button to complete that I have paid
        delete
        patch 
        Display the individual expense  
        db
        Websocket


left to do
 Deploying in the web server


                                  # Expense Splitter
A full-stack web application that lets friends quickly create groups, log shared expenses, see per-member balances, and chat in real-time—all in one place. Built with Node.js + Express, WebSockets (same port), and a lightweight NeDB (JSONL) database.

Demo (about 2 min)
1. Register → log in → redirected to home.html
2. Create a group and see it in “Your Groups”
3. Join a group with its code
4. Add an expense → everyone’s balances update instantly
5. Open the chat modal and exchange a message

Key Features / Functionality
1. User authentication – register & login (bcrypt-hashed passwords)
Endpoints: POST /register, POST /login
2. Group CRUD – create, rename, delete, join by code
Endpoints: POST /groups/create, PATCH /groupdelete/:id, DELETE /groups/:id, POST /groups/join
3. Load my groups
Endpoint: GET /api/loadmygroup?id=
4. Expense tracking – add expenses & auto-split cost
Endpoints: POST /groups/:id/expenses, GET /groups/:id/expenses
5. Balances / settle up – mark paid
Endpoint: PATCH /groups/:id/paid
6. Real-time chat per group (same-port WebSocket)
Endpoint: ws://HOST/ws/
7. Responsive front end – plain HTML/CSS/JS forms
Location: public/*.html

Tech Stack

• Backend: Node.js 22, Express 5, ws (WebSocket), nedb-promises (embedded JSONL DB)
• Frontend: plain HTML/CSS/JS (no framework) served from /public
• Auth: bcrypt password hashing
• UUIDs: uuid v4 for IDs

Installation & Local Setup
1. Clone the repo
git clone https://github.com//expense-splitter.git
cd expense-splitter
2. Install dependencies
npm install
3. Run the combined HTTP + WebSocket server
node server.js   (defaults to http://localhost:3000)

Open http://localhost:3000 and register to explore.

Environment variables (optional)

PORT  3000  – change listening port

API Reference

POST   /register                    { username, email, password }
POST   /login                       { username, password }
POST   /groups/create               { name, userId }
POST   /groups/join                 { code, userId }
GET    /api/loadmygroup?id=UID
GET    /api/groups/:groupId/users
POST   /groups/:groupId/expenses    { name, amount }
GET    /groups/:groupId/expenses
PATCH  /groups/:groupId/paid        { uid }
PATCH  /groupdelete/:groupId        { newName }
DELETE /groups/:groupId

WebSocket Messages

Connect:  ws://HOST:PORT/ws/
Send:     { “username”: “alice”, “text”: “Dinner cost $42” }
Receive:  Same JSON broadcast to every socket in the group.

Folder Structure

expense-splitter/
├── server.js          Express + WebSocket + NeDB backend
├── mydb.jsonl         Lightweight JSONL datastore (auto-created)
├── public/            Static frontend
│   ├── index.html     Login / Register landing
│   ├── home.html      Dashboard – create / join groups
│   ├── group-details.html
│   ├── css/ …         Optional styling
│   └── js/            login.js, register.js, home.js, groupdetail.js
└── README.md          (this file)

Running the Tests (manual)

Because this is a lightweight project, tests are manual:
1. Start two browser tabs (or incognito windows).
2. Register / log in two different users.
3. Create a group with User A and join via code with User B.
4. Add an expense and verify balances and real-time chat updates in both tabs.





