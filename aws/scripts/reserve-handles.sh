#!/bin/bash

# Reserve handles in DynamoDB
TABLE_NAME="knexmail-waitlist"
REGION="us-east-1"

# All reserved handles
HANDLES=(
  # Official & System
  admin support help team knexmail knexcoin knexpay official system noreply
  contact info security abuse postmaster webmaster mailer-daemon no-reply
  donotreply notifications alerts newsletter updates announcements status

  # Founder / Company
  david systemthreat founder ceo cto cfo coo staff employee intern hr legal
  compliance finance operations

  # Features & Services
  api dev beta alpha test testing staging prod production sandbox demo trial
  billing payments sales marketing press media partners affiliates

  # Common Words
  mail email inbox account user profile settings login signup register password
  reset verify confirm welcome home dashboard app mobile web desktop android
  ios windows mac

  # Religious & Political
  god jesus christ allah muhammad buddha satan devil trump biden obama clinton
  putin hitler nazi isis terrorist hamas israel palestine

  # Celebrities & Famous
  elon musk bezos zuckerberg gates jobs wozniak satoshi nakamoto vitalik
  buterin dorsey sama altman openai

  # Crypto & Finance
  bitcoin ethereum crypto blockchain wallet token nft defi web3 solana cardano
  ripple doge shiba binance coinbase ftx bank money cash

  # Brands & Trademarks
  google apple microsoft amazon facebook meta twitter instagram tiktok snapchat
  discord telegram whatsapp signal protonmail

  # Vulgar & Abuse Prevention
  fuck shit ass bitch dick pussy cock cunt nigger faggot porn sex xxx nude naked

  # Technical Reserved
  root administrator localhost null undefined void error 404 500 config debug
  log temp tmp cache

  # Single Letters
  a b c d e f g h i j k l m n o p q r s t u v w x y z

  # Single Numbers
  0 1 2 3 4 5 6 7 8 9
)

echo "Reserving ${#HANDLES[@]} handles..."
SUCCESS=0
FAILED=0

for handle in "${HANDLES[@]}"; do
  # Convert to lowercase
  normalized="@$(echo "$handle" | tr '[:upper:]' '[:lower:]')"
  upper_handle="$(echo "$handle" | tr '[:lower:]' '[:upper:]')"
  timestamp=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")

  aws dynamodb put-item \
    --table-name "$TABLE_NAME" \
    --region "$REGION" \
    --item "{
      \"handle\": {\"S\": \"$normalized\"},
      \"email\": {\"S\": \"reserved@knexmail.com\"},
      \"referralCode\": {\"S\": \"RESERVED-$upper_handle\"},
      \"referralCount\": {\"N\": \"0\"},
      \"reserved\": {\"BOOL\": true},
      \"createdAt\": {\"S\": \"$timestamp\"}
    }" \
    --condition-expression "attribute_not_exists(handle)" 2>/dev/null

  if [ $? -eq 0 ]; then
    echo "✓ Reserved: $normalized"
    ((SUCCESS++))
  else
    echo "- Skipped (exists): $normalized"
  fi
done

echo ""
echo "Done! Reserved: $SUCCESS handles"
