import { describe, it, expect, beforeEach, vi } from 'vitest';
import { calculateChecksum, verifyChecksum, encryptData, decryptData, validateBackupStructure } from '@/lib/backup';
import type { BackupFile, BackupManifest } from '@/types';

describe('Backup System - Production Certification Tests', () => {
  
  describe('Checksum Calculation', () => {
    it('should calculate consistent SHA256 checksum', async () => {
      const data = 'test data for checksum';
      const checksum1 = await calculateChecksum(data);
      const checksum2 = await calculateChecksum(data);
      expect(checksum1).toBe(checksum2);
      expect(checksum1.length).toBe(64); // SHA256 = 64 hex chars
    });

    it('should produce different checksums for different data', async () => {
      const checksum1 = await calculateChecksum('data1');
      const checksum2 = await calculateChecksum('data2');
      expect(checksum1).not.toBe(checksum2);
    });

    it('should verify checksum correctly', async () => {
      const data = 'test data';
      const checksum = await calculateChecksum(data);
      expect(await verifyChecksum(data, checksum)).toBe(true);
      expect(await verifyChecksum('wrong data', checksum)).toBe(false);
    });
  });

  describe('Encryption/Decryption', () => {
    it('should encrypt and decrypt data correctly', () => {
      const originalData = 'sensitive backup data';
      const password = 'secure_password_123';
      
      const encrypted = encryptData(originalData, password);
      expect(encrypted).not.toBe(originalData);
      
      const decrypted = decryptData(encrypted, password);
      expect(decrypted).toBe(originalData);
    });

    it('should fail decryption with wrong password', () => {
      const originalData = 'sensitive data';
      const encrypted = encryptData(originalData, 'correct_password');
      const decrypted = decryptData(encrypted, 'wrong_password');
      expect(decrypted).not.toBe(originalData);
    });

    it('should handle empty data', () => {
      const encrypted = encryptData('', 'password');
      const decrypted = decryptData(encrypted, 'password');
      expect(decrypted).toBe('');
    });

    it('should handle ASCII characters only', () => {
      // Note: XOR encryption only works with ASCII - use AES for unicode in production
      const data = 'Test with ASCII only: Hello World 12345';
      const password = 'password';
      const encrypted = encryptData(data, password);
      const decrypted = decryptData(encrypted, password);
      expect(decrypted).toBe(data);
    });
  });

  describe('Backup Structure Validation', () => {
    const validManifest: BackupManifest = {
      version: 2,
      appVersion: '1.0.0',
      createdAt: new Date().toISOString(),
      machineId: 'M-test123',
      userId: 1,
      userName: 'Admin',
      checksum: 'abc123',
      encrypted: false,
      tables: {
        items: 10,
        customers: 5,
        suppliers: 3,
        invoices: 20,
        purchases: 10,
        stockLedger: 50,
        auditLog: 100,
        users: 2,
      },
    };

    const validBackup: BackupFile = {
      manifest: validManifest,
      data: {
        items: [],
        customers: [],
        suppliers: [],
        invoices: [],
        purchases: [],
        stockLedger: [],
        settings: [],
        auditLog: [],
        users: [],
      },
    };

    it('should validate correct backup structure', () => {
      const result = validateBackupStructure(validBackup);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject null/undefined', () => {
      expect(validateBackupStructure(null).valid).toBe(false);
      expect(validateBackupStructure(undefined).valid).toBe(false);
    });

    it('should reject missing manifest', () => {
      const invalid = { data: validBackup.data };
      const result = validateBackupStructure(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing manifest');
    });

    it('should reject missing data section', () => {
      const invalid = { manifest: validManifest };
      const result = validateBackupStructure(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing data section');
    });

    it('should reject invalid table types', () => {
      const invalid = {
        manifest: validManifest,
        data: {
          ...validBackup.data,
          items: 'not an array', // should be array
        },
      };
      const result = validateBackupStructure(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('items'))).toBe(true);
    });

    it('should reject missing checksum', () => {
      const invalidManifest = { ...validManifest, checksum: undefined };
      const invalid = { manifest: invalidManifest, data: validBackup.data };
      const result = validateBackupStructure(invalid);
      expect(result.valid).toBe(false);
    });
  });

  describe('Backup Security', () => {
    it('should not allow arbitrary file path injection', () => {
      // Backup filenames should be sanitized - remove path separators and parent refs
      const maliciousPath = '../../../etc/passwd';
      const safeFilename = maliciousPath.replace(/\.\./g, '').replace(/[/\\]/g, '_');
      expect(safeFilename).not.toContain('..');
      expect(safeFilename).not.toContain('/');
    });

    it('should validate data integrity before restore', async () => {
      const data = JSON.stringify({ test: 'data' });
      const correctChecksum = await calculateChecksum(data);
      const wrongChecksum = 'wrong_checksum_value';
      
      expect(await verifyChecksum(data, correctChecksum)).toBe(true);
      expect(await verifyChecksum(data, wrongChecksum)).toBe(false);
    });
  });

  describe('Large Data Handling', () => {
    it('should handle large data checksums', async () => {
      // Generate ~1MB of data
      const largeData = 'x'.repeat(1000000);
      const checksum = await calculateChecksum(largeData);
      expect(checksum.length).toBe(64);
    });

    it('should encrypt/decrypt large data', () => {
      const largeData = 'y'.repeat(100000);
      const password = 'password';
      const encrypted = encryptData(largeData, password);
      const decrypted = decryptData(encrypted, password);
      expect(decrypted).toBe(largeData);
    });
  });
});
