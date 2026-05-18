import { hash, compare } from '../metaverse-2d/apps/http/src/scrypt';

describe('scrypt', () => {
    describe('hash', () => {
        test('should return a valid hash with salt', async () => {
            const hashedPassword = await hash('testpassword123');
            
            // Hash should contain a dot separator between salt and hash
            expect(hashedPassword).toContain('.');
            
            // Split into salt and hash
            const [salt, hashKey] = hashedPassword.split('.');
            
            // Salt should be 32 hex characters (16 bytes)
            expect(salt).toHaveLength(32);
            
            // Hash should be 64 hex characters (32 bytes for scrypt with keyLength=32)
            expect(hashKey).toHaveLength(64);
        });

        test('should return different hashes for the same password (due to random salt)', async () => {
            const password = 'samepassword';
            
            const hash1 = await hash(password);
            const hash2 = await hash(password);
            
            // Should be different because of random salt
            expect(hash1).not.toBe(hash2);
        });

        test('should handle empty password', async () => {
            const hashedPassword = await hash('');
            
            expect(hashedPassword).toContain('.');
            const [salt, hashKey] = hashedPassword.split('.');
            expect(salt).toHaveLength(32);
            expect(hashKey).toHaveLength(64);
        });

        test('should handle long password', async () => {
            const longPassword = 'a'.repeat(1000);
            const hashedPassword = await hash(longPassword);
            
            expect(hashedPassword).toContain('.');
            const [salt, hashKey] = hashedPassword.split('.');
            expect(salt).toHaveLength(32);
            expect(hashKey).toHaveLength(64);
        });
    });

    describe('compare', () => {
        test('should return true for correct password', async () => {
            const password = 'correctpassword';
            const hashedPassword = await hash(password);
            
            const isValid = await compare(password, hashedPassword);
            
            expect(isValid).toBe(true);
        });

        test('should return false for incorrect password', async () => {
            const correctPassword = 'correctpassword';
            const wrongPassword = 'wrongpassword';
            
            const hashedPassword = await hash(correctPassword);
            
            const isValid = await compare(wrongPassword, hashedPassword);
            
            expect(isValid).toBe(false);
        });

        test('should return false for empty password when hash is for non-empty', async () => {
            const password = 'password123';
            const hashedPassword = await hash(password);
            
            const isValid = await compare('', hashedPassword);
            
            expect(isValid).toBe(false);
        });

        test('should throw an error for invalid hash format', async () => {
            const hashedPassword = await hash('password123');
            
            // Empty hash format will cause parsing to fail - function throws
            await expect(compare('password123', '')).rejects.toThrow();
        });

        test('should return false for tampered hash', async () => {
            const password = 'mypassword';
            const hashedPassword = await hash(password);
            
            // Tamper with the hash by changing a character
            const tamperedHash = hashedPassword.slice(0, -1) + (hashedPassword.slice(-1) === 'a' ? 'b' : 'a');
            
            const isValid = await compare(password, tamperedHash);
            
            expect(isValid).toBe(false);
        });
    });

    describe('hash and compare integration', () => {
        test('should successfully hash and verify multiple passwords', async () => {
            const passwords = ['password1', 'password2', 'password3', 'password4', 'password5'];
            
            for (const password of passwords) {
                const hashedPassword = await hash(password);
                const isValid = await compare(password, hashedPassword);
                expect(isValid).toBe(true);
                
                // Verify other passwords don't work
                for (const otherPassword of passwords) {
                    if (otherPassword !== password) {
                        const otherValid = await compare(otherPassword, hashedPassword);
                        expect(otherValid).toBe(false);
                    }
                }
            }
        });
    });
});