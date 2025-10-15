#!/bin/bash

# Teste manual do webhook
# Substitua a URL pelo seu túnel atual

WEBHOOK_URL="https://62146800433151bd455cf383cc47d1d6.serveo.net/api/webhooks/fal"
REQUEST_ID="705ac161-ec9d-4950-bb72-2eb7a5a0e8fe"

echo "Testando webhook..."
echo "URL: $WEBHOOK_URL"
echo "Request ID: $REQUEST_ID"
echo ""

curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"request_id\": \"$REQUEST_ID\",
    \"status\": \"OK\",
    \"payload\": {
      \"images\": [{
        \"url\": \"https://v3b.fal.media/files/test/test.jpg\"
      }]
    }
  }"

echo ""
echo "Teste concluído!"
