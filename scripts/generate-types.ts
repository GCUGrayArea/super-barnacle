#!/usr/bin/env tsx

/**
 * Type Generation Script
 *
 * This script validates the OpenAPI specification and provides guidance for
 * regenerating TypeScript types and Zod schemas.
 *
 * Usage:
 *   npm run generate-types
 *   or
 *   tsx scripts/generate-types.ts
 *
 * The current implementation uses manually crafted types and schemas for better
 * control and documentation. If you need to regenerate from a updated OpenAPI spec:
 *
 * 1. Update docs/openapi.json with the new specification
 * 2. Review the changes in the specification
 * 3. Manually update src/types/skyfi-api.ts and src/schemas/skyfi.schemas.ts
 * 4. Run this script to validate the specification
 * 5. Run tests to ensure everything still works
 *
 * Future: Consider integrating openapi-typescript or similar tools for automated generation.
 */

import * as fs from 'fs/promises';
import * as path from 'path';

interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    version: string;
  };
  paths: Record<string, unknown>;
  components: {
    schemas: Record<string, SchemaObject>;
  };
}

interface SchemaObject {
  type?: string;
  enum?: string[];
  properties?: Record<string, unknown>;
  required?: string[];
  items?: unknown;
  anyOf?: unknown[];
  allOf?: unknown[];
  $ref?: string;
}

async function main() {
  console.log('=== SkyFi API Type Generation Script ===\n');

  // Load OpenAPI specification
  const specPath = path.join(process.cwd(), 'docs', 'openapi.json');
  console.log(`Loading OpenAPI spec from: ${specPath}`);

  let spec: OpenAPISpec;
  try {
    const specContent = await fs.readFile(specPath, 'utf-8');
    spec = JSON.parse(specContent) as OpenAPISpec;
    console.log(`✓ Loaded OpenAPI spec: ${spec.info.title} v${spec.info.version}\n`);
  } catch (error) {
    console.error(`✗ Failed to load OpenAPI spec: ${(error as Error).message}`);
    process.exit(1);
  }

  // Validate specification structure
  console.log('Validating specification structure...');
  const validationErrors: string[] = [];

  if (!spec.openapi) {
    validationErrors.push('Missing "openapi" version field');
  }

  if (!spec.info || !spec.info.title || !spec.info.version) {
    validationErrors.push('Missing or invalid "info" section');
  }

  if (!spec.paths || Object.keys(spec.paths).length === 0) {
    validationErrors.push('Missing or empty "paths" section');
  }

  if (!spec.components || !spec.components.schemas) {
    validationErrors.push('Missing "components.schemas" section');
  }

  if (validationErrors.length > 0) {
    console.error('✗ Validation failed:\n');
    validationErrors.forEach((error) => console.error(`  - ${error}`));
    process.exit(1);
  }

  console.log('✓ Specification structure is valid\n');

  // Analyze schemas
  const schemas = spec.components.schemas;
  const schemaNames = Object.keys(schemas);
  console.log(`Found ${schemaNames.length} schemas:\n`);

  // Categorize schemas
  const enums: string[] = [];
  const objects: string[] = [];
  const requests: string[] = [];
  const responses: string[] = [];

  schemaNames.forEach((name) => {
    const schema = schemas[name];

    if (schema.enum) {
      enums.push(name);
    } else if (name.includes('Request')) {
      requests.push(name);
    } else if (name.includes('Response')) {
      responses.push(name);
    } else {
      objects.push(name);
    }
  });

  console.log(`Enums (${enums.length}):`);
  enums.forEach((name) => {
    const schema = schemas[name];
    const values = schema.enum || [];
    console.log(`  - ${name}: ${values.join(', ')}`);
  });

  console.log(`\nRequest schemas (${requests.length}):`);
  requests.forEach((name) => console.log(`  - ${name}`));

  console.log(`\nResponse schemas (${responses.length}):`);
  responses.forEach((name) => console.log(`  - ${name}`));

  console.log(`\nOther object schemas (${objects.length}):`);
  objects.forEach((name) => console.log(`  - ${name}`));

  // Check for required types
  console.log('\n=== Checking for Required Types ===\n');

  const requiredTypes = [
    'GetArchivesRequest',
    'GetArchivesResponse',
    'ArchiveOrderRequest',
    'ArchiveOrderResponse-Output',
    'TaskingOrderRequest',
    'TaskingOrderResponse',
    'PlatformApiFeasibilityTaskRequest',
    'PlatformFeasibilityTaskResponse',
    'PlatformApiPassPredictionRequest',
    'PlatformPassPredictionResponse',
    'CreateNotificationRequest',
    'NotificationResponse',
    'ListNotificationsRequest',
    'ListNotificationsResponse',
    'ListOrdersRequest',
    'ListOrdersResponse',
  ];

  const missingTypes: string[] = [];
  requiredTypes.forEach((typeName) => {
    if (schemas[typeName]) {
      console.log(`✓ ${typeName}`);
    } else {
      console.log(`✗ ${typeName} - MISSING`);
      missingTypes.push(typeName);
    }
  });

  if (missingTypes.length > 0) {
    console.error(
      `\n✗ Missing ${missingTypes.length} required types. Please update the OpenAPI spec.`,
    );
    process.exit(1);
  }

  console.log('\n✓ All required types are present\n');

  // Check for enum consistency
  console.log('=== Checking Enum Consistency ===\n');

  const enumChecks = [
    {
      name: 'ProductType',
      expected: ['DAY', 'NIGHT', 'VIDEO', 'MULTISPECTRAL', 'HYPERSPECTRAL', 'SAR', 'STEREO'],
    },
    {
      name: 'DeliveryDriver',
      expected: ['GS', 'S3', 'AZURE'],
    },
    {
      name: 'OrderType',
      expected: ['ARCHIVE', 'TASKING'],
    },
  ];

  enumChecks.forEach(({ name, expected }) => {
    // Check both variations of ProductType
    const schemaNames = name === 'ProductType'
      ? ['shared__types__ProductType', 'skyfi_types__products__image_products__ProductType']
      : [name];

    schemaNames.forEach((schemaName) => {
      const schema = schemas[schemaName];
      if (schema && schema.enum) {
        const hasAllExpected = expected.every((val) => schema.enum!.includes(val));
        if (hasAllExpected) {
          console.log(`✓ ${schemaName} contains all expected values`);
        } else {
          console.log(
            `⚠ ${schemaName} missing some expected values: ${JSON.stringify(schema.enum)}`,
          );
        }
      } else if (schemaName !== 'DeliveryDriver') {
        // DeliveryDriver might not exist as a top-level schema
        console.log(`⚠ ${schemaName} not found or not an enum`);
      }
    });
  });

  // Summary and recommendations
  console.log('\n=== Summary ===\n');
  console.log('OpenAPI specification is valid and contains all required schemas.');
  console.log('\nCurrent type definitions location:');
  console.log('  - TypeScript types: src/types/skyfi-api.ts');
  console.log('  - Zod schemas: src/schemas/skyfi.schemas.ts');
  console.log('\nTo update type definitions:');
  console.log('  1. Review changes in docs/openapi.json');
  console.log('  2. Manually update src/types/skyfi-api.ts');
  console.log('  3. Manually update src/schemas/skyfi.schemas.ts');
  console.log('  4. Run: npm run typecheck');
  console.log('  5. Run: npm test');
  console.log('\n✓ Type generation validation complete\n');
}

// Run the script
main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
