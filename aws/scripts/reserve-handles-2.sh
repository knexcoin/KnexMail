#!/bin/bash

# Reserve additional official handles in DynamoDB
TABLE_NAME="knexmail-waitlist"
REGION="us-east-1"

# Additional official handles to prevent impersonation
HANDLES=(
  # KnexMail Variations (30)
  knexmail_official knexmail_support knexmail_team knexmail_help knexmail_admin
  knexmailofficial knexmailsupport knexmailteam knexmailhelp knexmailadmin
  theknexmail realknexmail knexmailhq knexmail_hq knexmailceo
  knexmail_ceo knexmailapp knexmail_app knexmaildev knexmail_dev
  knexmailbeta knexmail_beta knexmailnews knexmail_news knexmailpr
  knexmail_pr knexmailcare knexmail_care knexmailcustomer knexmail_customer

  # KnexCoin Variations (20)
  knexcoin_official knexcoinofficial theknexcoin realknexcoin knexcoinhq
  knexcoin_hq knexcoin_support knexcoinsupport knexcoin_team knexcointeam
  knexcoin_help knexcoinhelp knexcoin_admin knexcoinadmin knexcoin_dev
  knexcoindev knexcoin_ceo knexcoinceo knexcoin_news knexcoinnews

  # KnexPay Variations (15)
  knexpay_official knexpayofficial theknexpay realknexpay knexpayhq
  knexpay_hq knexpay_support knexpaysupport knexpay_team knexpayteam
  knexpay_help knexpayhelp knexpay_admin knexpayadmin knexpay_care

  # Official Keyword Combinations (40)
  official_support officialsupport official_team officialteam official_admin
  officialadmin official_help officialhelp official_news officialnews
  real_support realsupport real_admin realadmin real_team realteam
  the_team theteam the_admin theadmin the_support thesupport
  customer_support customersupport customer_service customerservice
  customer_care customercare tech_support techsupport technical_support
  helpdesk help_desk service_desk servicedesk moderator mod admin_team
  support_team help_team

  # Trusted/Verified Keywords (25)
  verified verified_account verifiedaccount trusted trusted_account
  trustedaccount authentic authentic_account authenticaccount
  legitimate legit real_account realaccount official_account
  officialaccount certified certified_account certifiedaccount
  authorized authorized_account authorizedaccount approved
  approved_account approvedaccount genuine

  # Staff/Employee Variations (20)
  staff_member staffmember team_member teammember employee_account
  employeeaccount knexstaff knex_staff knexteam knex_team
  knexemployee knex_employee knexworker knex_worker knexdev
  knex_dev knexengineer knex_engineer knexadmin knex_admin

  # Security & Trust (15)
  security_team securityteam trust_safety trustsafety trust_and_safety
  trustandsafety fraud fraud_prevention fraudprevention anti_fraud
  antifraud verification verify_account verifyaccount identity
)

echo "Reserving ${#HANDLES[@]} additional handles..."
SUCCESS=0

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
echo "Done! Reserved: $SUCCESS additional handles"
