/**
 * Unit tests for delivery configuration validator
 *
 * @packageDocumentation
 */

import { validateDeliveryConfiguration, validateWebhookUrl } from '@/lib/delivery-validator';
import { DeliveryDriver } from '@/types/orders';
import { DeliveryValidationError } from '@/lib/errors';

describe('validateDeliveryConfiguration', () => {
  describe('S3 delivery validation', () => {
    it('should validate correct S3 configuration', () => {
      const validS3Params = {
        s3_bucket_id: 'my-test-bucket',
        aws_region: 'us-east-1',
        aws_access_key: 'AKIAIOSFODNN7EXAMPLE',
        aws_secret_key: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
      };

      expect(() => {
        validateDeliveryConfiguration(DeliveryDriver.S3, validS3Params);
      }).not.toThrow();
    });

    it('should reject S3 config with invalid access key format', () => {
      const invalidS3Params = {
        s3_bucket_id: 'my-test-bucket',
        aws_region: 'us-east-1',
        aws_access_key: 'INVALID_KEY_FORMAT',
        aws_secret_key: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
      };

      expect(() => {
        validateDeliveryConfiguration(DeliveryDriver.S3, invalidS3Params);
      }).toThrow(DeliveryValidationError);
    });

    it('should reject S3 config with missing required fields', () => {
      const invalidS3Params = {
        s3_bucket_id: 'my-test-bucket',
        aws_region: 'us-east-1',
      };

      expect(() => {
        validateDeliveryConfiguration(DeliveryDriver.S3, invalidS3Params);
      }).toThrow(DeliveryValidationError);
    });

    it('should accept ASIA temporary credentials', () => {
      const tempCredsParams = {
        s3_bucket_id: 'my-test-bucket',
        aws_region: 'us-west-2',
        aws_access_key: 'ASIAIOSFODNN7EXAMPLE',
        aws_secret_key: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
      };

      expect(() => {
        validateDeliveryConfiguration(DeliveryDriver.S3, tempCredsParams);
      }).not.toThrow();
    });
  });

  describe('GCS delivery validation', () => {
    it('should validate correct GCS configuration', () => {
      const validGCSParams = {
        gs_project_id: 'my-gcp-project',
        gs_bucket_id: 'my-gcs-bucket',
        gs_credentials: {
          type: 'service_account',
          project_id: 'my-gcp-project',
          private_key_id: 'abc123',
          private_key: '-----BEGIN PRIVATE KEY-----
test
-----END PRIVATE KEY-----
',
          client_email: 'test-sa@my-gcp-project.iam.gserviceaccount.com',
          client_id: '123456789',
          auth_uri: 'https://accounts.google.com/o/oauth2/auth',
          token_uri: 'https://oauth2.googleapis.com/token',
          auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
          client_x509_cert_url: 'https://www.googleapis.com/service/account',
        },
      };

      expect(() => {
        validateDeliveryConfiguration(DeliveryDriver.GS, validGCSParams);
      }).not.toThrow();
    });

    it('should reject GCS config with mismatched project IDs', () => {
      const invalidGCSParams = {
        gs_project_id: 'project-a',
        gs_bucket_id: 'my-gcs-bucket',
        gs_credentials: {
          type: 'service_account',
          project_id: 'project-b',
          private_key_id: 'abc123',
          private_key: '-----BEGIN PRIVATE KEY-----
test
-----END PRIVATE KEY-----
',
          client_email: 'test-sa@project-b.iam.gserviceaccount.com',
          client_id: '123456789',
          auth_uri: 'https://accounts.google.com/o/oauth2/auth',
          token_uri: 'https://oauth2.googleapis.com/token',
          auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
          client_x509_cert_url: 'https://www.googleapis.com/service/account',
        },
      };

      expect(() => {
        validateDeliveryConfiguration(DeliveryDriver.GS, invalidGCSParams);
      }).toThrow(DeliveryValidationError);
    });

    it('should reject GCS config with invalid service account email', () => {
      const invalidGCSParams = {
        gs_project_id: 'my-gcp-project',
        gs_bucket_id: 'my-gcs-bucket',
        gs_credentials: {
          type: 'service_account',
          project_id: 'my-gcp-project',
          private_key_id: 'abc123',
          private_key: '-----BEGIN PRIVATE KEY-----
test
-----END PRIVATE KEY-----
',
          client_email: 'invalid-email@gmail.com',
          client_id: '123456789',
          auth_uri: 'https://accounts.google.com/o/oauth2/auth',
          token_uri: 'https://oauth2.googleapis.com/token',
          auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
          client_x509_cert_url: 'https://www.googleapis.com/service/account',
        },
      };

      expect(() => {
        validateDeliveryConfiguration(DeliveryDriver.GS, invalidGCSParams);
      }).toThrow(DeliveryValidationError);
    });

    it('should reject GCS config with invalid private key format', () => {
      const invalidGCSParams = {
        gs_project_id: 'my-gcp-project',
        gs_bucket_id: 'my-gcs-bucket',
        gs_credentials: {
          type: 'service_account',
          project_id: 'my-gcp-project',
          private_key_id: 'abc123',
          private_key: 'invalid-private-key',
          client_email: 'test-sa@my-gcp-project.iam.gserviceaccount.com',
          client_id: '123456789',
          auth_uri: 'https://accounts.google.com/o/oauth2/auth',
          token_uri: 'https://oauth2.googleapis.com/token',
          auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
          client_x509_cert_url: 'https://www.googleapis.com/service/account',
        },
      };

      expect(() => {
        validateDeliveryConfiguration(DeliveryDriver.GS, invalidGCSParams);
      }).toThrow(DeliveryValidationError);
    });
  });

  describe('Azure delivery validation', () => {
    describe('Connection String method', () => {
      it('should validate correct Azure connection string config', () => {
        const validAzureParams = {
          azure_container_id: 'my-container',
          azure_connection_string:
            'DefaultEndpointsProtocol=https;AccountName=myaccount;AccountKey=abc123==;EndpointSuffix=core.windows.net',
        };

        expect(() => {
          validateDeliveryConfiguration(DeliveryDriver.AZURE, validAzureParams);
        }).not.toThrow();
      });

      it('should reject Azure connection string missing AccountName', () => {
        const invalidAzureParams = {
          azure_container_id: 'my-container',
          azure_connection_string: 'DefaultEndpointsProtocol=https;AccountKey=abc123==',
        };

        expect(() => {
          validateDeliveryConfiguration(DeliveryDriver.AZURE, invalidAzureParams);
        }).toThrow(DeliveryValidationError);
      });

      it('should reject Azure connection string missing AccountKey', () => {
        const invalidAzureParams = {
          azure_container_id: 'my-container',
          azure_connection_string: 'DefaultEndpointsProtocol=https;AccountName=myaccount',
        };

        expect(() => {
          validateDeliveryConfiguration(DeliveryDriver.AZURE, invalidAzureParams);
        }).toThrow(DeliveryValidationError);
      });
    });

    describe('Entra App method', () => {
      it('should validate correct Azure Entra App config', () => {
        const validEntraParams = {
          azure_storage_account_name: 'mystorageaccount',
          azure_container_id: 'my-container',
          azure_tenant_id: '12345678-1234-1234-1234-123456789012',
          azure_client_id: '87654321-4321-4321-4321-210987654321',
          azure_client_secret: 'my-client-secret',
        };

        expect(() => {
          validateDeliveryConfiguration(DeliveryDriver.AZURE, validEntraParams);
        }).not.toThrow();
      });

      it('should reject invalid storage account name', () => {
        const invalidEntraParams = {
          azure_storage_account_name: 'My-Invalid-Name!',
          azure_container_id: 'my-container',
          azure_tenant_id: '12345678-1234-1234-1234-123456789012',
          azure_client_id: '87654321-4321-4321-4321-210987654321',
          azure_client_secret: 'my-client-secret',
        };

        expect(() => {
          validateDeliveryConfiguration(DeliveryDriver.AZURE, invalidEntraParams);
        }).toThrow(DeliveryValidationError);
      });

      it('should reject invalid tenant ID format', () => {
        const invalidEntraParams = {
          azure_storage_account_name: 'mystorageaccount',
          azure_container_id: 'my-container',
          azure_tenant_id: 'not-a-uuid',
          azure_client_id: '87654321-4321-4321-4321-210987654321',
          azure_client_secret: 'my-client-secret',
        };

        expect(() => {
          validateDeliveryConfiguration(DeliveryDriver.AZURE, invalidEntraParams);
        }).toThrow(DeliveryValidationError);
      });

      it('should reject invalid client ID format', () => {
        const invalidEntraParams = {
          azure_storage_account_name: 'mystorageaccount',
          azure_container_id: 'my-container',
          azure_tenant_id: '12345678-1234-1234-1234-123456789012',
          azure_client_id: 'not-a-uuid',
          azure_client_secret: 'my-client-secret',
        };

        expect(() => {
          validateDeliveryConfiguration(DeliveryDriver.AZURE, invalidEntraParams);
        }).toThrow(DeliveryValidationError);
      });
    });
  });

  describe('Edge cases', () => {
    it('should allow NONE driver without params', () => {
      expect(() => {
        validateDeliveryConfiguration(DeliveryDriver.NONE, null);
      }).not.toThrow();
    });

    it('should allow null driver without params', () => {
      expect(() => {
        validateDeliveryConfiguration(null, null);
      }).not.toThrow();
    });

    it('should reject params without driver', () => {
      const params = {
        s3_bucket_id: 'test',
        aws_region: 'us-east-1',
        aws_access_key: 'AKIATEST',
        aws_secret_key: '1234567890123456789012345678901234567890',
      };

      expect(() => {
        validateDeliveryConfiguration(null, params);
      }).not.toThrow();
    });

    it('should reject driver without params', () => {
      expect(() => {
        validateDeliveryConfiguration(DeliveryDriver.S3, null);
      }).toThrow(DeliveryValidationError);
    });

    it('should allow DELIVERY_CONFIG driver', () => {
      expect(() => {
        validateDeliveryConfiguration(DeliveryDriver.DELIVERY_CONFIG, {});
      }).not.toThrow();
    });
  });
});

describe('validateWebhookUrl', () => {
  it('should validate correct HTTPS webhook URL', () => {
    expect(() => {
      validateWebhookUrl('https://example.com/webhook');
    }).not.toThrow();
  });

  it('should reject HTTP webhook URL', () => {
    expect(() => {
      validateWebhookUrl('http://example.com/webhook');
    }).toThrow(DeliveryValidationError);
  });

  it('should reject invalid URL format', () => {
    expect(() => {
      validateWebhookUrl('not-a-url');
    }).toThrow(DeliveryValidationError);
  });

  it('should reject URL exceeding length limit', () => {
    const longUrl = 'https://example.com/' + 'a'.repeat(3000);
    expect(() => {
      validateWebhookUrl(longUrl);
    }).toThrow(DeliveryValidationError);
  });

  it('should allow null webhook URL', () => {
    expect(() => {
      validateWebhookUrl(null);
    }).not.toThrow();
  });

  it('should allow undefined webhook URL', () => {
    expect(() => {
      validateWebhookUrl(undefined);
    }).not.toThrow();
  });
});
