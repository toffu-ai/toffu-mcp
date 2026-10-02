# Toffu MCP Server - install guide



Toffu is a hosted remote MCP server. There is nothing to install or build locally.



- Endpoint: https://mcp.toffu.ai/mcp (streamable HTTP)
- 
- Auth: Bearer API key, or OAuth 2.1 with PKCE and Dynamic Client Registration
- 
- Docs: https://toffu.ai/agents and https://toffu.ai/llms.txt
- 


To get an API key, follow the "Onboard with no human" section of README.md.



## Cline



Add this to cline_mcp_settings.json:



{

  "mcpServers": {
  
    "toffu": {
    
      "type": "streamableHttp",
      
      "url": "https://mcp.toffu.ai/mcp",
      
      "headers": { "Authorization": "Bearer <api_key>" },
      
      "disabled": false
      
    }
    
  }
  
}



## Claude Code



claude mcp add --transport http toffu https://mcp.toffu.ai/mcp --header "Authorization: Bearer <api_key>"



## Tools



send_message, query_campaign_performance, creative_report, propose_change, apply_change, undo_change, fetch_memory.












