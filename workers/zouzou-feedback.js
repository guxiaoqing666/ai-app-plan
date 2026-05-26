/**
 * Cloudflare Worker: 走走AI 反馈收集代理
 * 接收前端反馈数据，转发到飞书多维表格
 */

const FEISHU_APP_ID = "cli_aa9ff8ba15ba1bca";
const FEISHU_APP_SECRET = "kdTUXIWgRBT3csN9Bfbvbh2M4eFTpG35";
const FEISHU_APP_TOKEN = "LKcMbdHDSavWaFsSgHMc7RoanBd";
const FEISHU_TABLE_ID = "tbl2PmPVv1SnuLaM";

// CORS headers for frontend access
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json"
};

export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Only accept POST
    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: corsHeaders
      });
    }

    try {
      const payload = await request.json();

      // Validate required fields
      if (!payload.contact && !payload.message) {
        return new Response(JSON.stringify({ error: "Contact or message required" }), {
          status: 400,
          headers: corsHeaders
        });
      }

      // Get Feishu tenant access token
      const token = await getTenantAccessToken();
      if (!token) {
        return new Response(JSON.stringify({ error: "Failed to authenticate with Feishu" }), {
          status: 500,
          headers: corsHeaders
        });
      }

      // Create record in Bitable
      const recordData = {
        fields: {
          "联系方式": String(payload.contact || "").trim(),
          "需求": String(payload.need || "").trim(),
          "反馈内容": String(payload.message || "").trim(),
          "当前路线ID": String(payload.routeId || "").trim()
        }
      };

      const feishuResp = await fetch(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${FEISHU_APP_TOKEN}/tables/${FEISHU_TABLE_ID}/records`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json; charset=utf-8"
          },
          body: JSON.stringify(recordData)
        }
      );

      const feishuResult = await feishuResp.json();

      if (feishuResult.code === 0) {
        return new Response(JSON.stringify({ success: true, recordId: feishuResult.data?.record?.record_id }), {
          status: 200,
          headers: corsHeaders
        });
      } else {
        return new Response(JSON.stringify({ error: "Feishu API error", code: feishuResult.code }), {
          status: 502,
          headers: corsHeaders
        });
      }

    } catch (error) {
      return new Response(JSON.stringify({ error: "Internal error", message: error.message }), {
        status: 500,
        headers: corsHeaders
      });
    }
  }
};

async function getTenantAccessToken() {
  const cache = caches.default;
  const cacheKey = new Request("https://internal/feishu-token");

  // Try cache first
  let cached = await cache.match(cacheKey);
  if (cached) {
    const data = await cached.json();
    if (data.expire > Date.now() / 1000 + 60) {
      return data.tenant_access_token;
    }
  }

  // Fetch new token
  const resp = await fetch("https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      app_id: FEISHU_APP_ID,
      app_secret: FEISHU_APP_SECRET
    })
  });

  const data = await resp.json();
  if (data.code === 0) {
    // Cache token (expires in 7200s, cache for slightly less)
    const cacheResp = new Response(JSON.stringify(data), {
      headers: { "Cache-Control": "max-age=6900" }
    });
    await cache.put(cacheKey, cacheResp);
    return data.tenant_access_token;
  }

  return null;
}
