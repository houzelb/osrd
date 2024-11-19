#!/bin/sh
if ! npx @rtk-query/codegen-openapi src/config/openapi-editoast-config.ts; then
    echo "npx @rtk-query/codegen-openapi src/config/openapi-editoast-config.ts command failed. Exit the script"
    exit 1
fi
npm exec -- eslint --fix src/common/api/generatedEditoastApi.ts --no-ignore
if ! npx @rtk-query/codegen-openapi src/config/openapi-gateway-config.ts; then
    echo "npx @rtk-query/codegen-openapi src/config/openapi-gateway-config.ts command failed. Exit the script"
    exit 1
fi
npm exec -- eslint --fix src/common/api/osrdGatewayApi.ts --no-ignore
