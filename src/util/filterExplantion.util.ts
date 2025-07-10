import express from "express";
const docxRouter = express.Router();

docxRouter.get("/query-guide", (_req, res) => {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Query Parameters Guide</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      margin: 2rem auto;
      max-width: 900px;
      background: #f9f9f9;
      padding: 2rem;
      color: #333;
    }
    h1, h2 {
      color: #222;
    }
    code {
      background: #eee;
      padding: 0.3em 0.5em;
      border-radius: 4px;
      font-size: 0.95em;
    }
    .section {
      margin-bottom: 2rem;
    }
    .example {
      background: #fff;
      padding: 1rem;
      border-left: 5px solid #007acc;
      margin: 1rem 0;
      font-family: monospace;
      white-space: pre-wrap;
    }
  </style>
</head>
<body>
  <h1>🧠 Using Query Parameters for Filtering, Sorting, Pagination, and Fields</h1>
  <p>This guide explains how to use query parameters with <strong>any resource</strong> in the API that supports advanced querying (e.g., <code>/rooms</code>, <code>/room-types</code>, <code>/events</code>, etc.).</p>

  <div class="section">
    <h2>🔍 Filtering</h2>
    <p>Use any field as a query to filter results:</p>
    <div class="example">/api/v1/rooms?status=free&floorNumber=1</div>

    <p><strong>Advanced filtering</strong> is also supported using MongoDB-style operators:</p>
    <ul>
      <li><code>[gte]</code> → greater than or equal</li>
      <li><code>[gt]</code> → greater than</li>
      <li><code>[lte]</code> → less than or equal</li>
      <li><code>[lt]</code> → less than</li>
    </ul>
    <div class="example">/api/v1/rooms?floorNumber[gte]=2&status=free</div>
  </div>

  <div class="section">
    <h2>🔃 Sorting</h2>
    <p>Use <code>sort</code> to order results by fields. Prefix with <code>-</code> for descending order:</p>
    <div class="example">/api/v1/rooms?sort=-createdAt</div>
    <p>Multi-level sort:</p>
    <div class="example">/api/v1/rooms?sort=floorNumber,-number</div>
  </div>

  <div class="section">
    <h2>📦 Pagination</h2>
    <p>Use <code>page</code> and <code>limit</code> to paginate results.</p>
    <div class="example">/api/v1/rooms?page=2&limit=5</div>
    <p>This skips the first 5 results and returns the next 5.</p>
  </div>

  <div class="section">
    <h2>🎯 Field Selection (Limiting)</h2>
    <p>Use <code>fields</code> to return only specific fields:</p>
    <div class="example">/api/v1/rooms?fields=number,status,floorNumber</div>
    <p>This reduces payload size by returning only selected fields.</p>
  </div>

  <div class="section">
    <h2>✅ Combine All Features</h2>
    <p>All query options can be used together:</p>
    <div class="example">/api/v1/rooms?status=free&sort=-createdAt&fields=number,status&limit=10&page=1</div>
    <p>This returns free rooms, sorted by newest, showing only number and status fields, paginated.</p>
  </div>

  <div class="section">
    <h2>💡 Applies to All Resources</h2>
    <p>This system works for any endpoint that uses the common <code>Query</code> utility (e.g., rooms, events, room-types, venues).</p>
  </div>
</body>
</html>
  `;

  res.setHeader("Content-Type", "text/html");
  res.status(200).send(html);
});

export default docxRouter;
