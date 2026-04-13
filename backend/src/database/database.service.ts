import { Injectable, NotFoundException } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execPromise = promisify(exec);

@Injectable()
export class DatabaseService {

    /** Returns the absolute path of a backup file by type ('manual' | 'automatic') */
    getBackupFilePath(type: 'manual' | 'automatic' = 'manual'): string {
        const backupsDir = path.join(process.cwd(), '..', 'backups');
        const filename = type === 'manual' ? 'backup_manual.sql' : 'backup_automatic.sql';
        return path.join(backupsDir, filename);
    }

    /** Cross-platform pg_dump resolver */
    private findPgDump(): string {
        if (process.platform === 'win32') {
            const portable = path.join(process.cwd(), '..', 'postgresql-portable', 'bin', 'pg_dump.exe');
            if (fs.existsSync(portable)) return portable;
            const candidates = [16, 17, 15, 14, 18].map(
                v => `C:\\Program Files\\PostgreSQL\\${v}\\bin\\pg_dump.exe`
            );
            for (const p of candidates) {
                if (fs.existsSync(p)) return p;
            }
            return 'pg_dump.exe';
        }
        // Linux / macOS (Hostinger VPS) — pg_dump is in PATH
        return 'pg_dump';
    }

    /** Returns metadata about the latest manual and automatic backup files */
    async getBackupInfo() {
        const types: Array<'manual' | 'automatic'> = ['manual', 'automatic'];
        const info: Record<string, { exists: boolean; size?: number; createdAt?: string }> = {};

        for (const type of types) {
            const filePath = this.getBackupFilePath(type);
            if (fs.existsSync(filePath)) {
                const stats = fs.statSync(filePath);
                info[type] = {
                    exists: true,
                    size: stats.size,
                    createdAt: stats.mtime.toISOString(),
                };
            } else {
                info[type] = { exists: false };
            }
        }
        return info;
    }

    async createBackup(isManual: boolean = false) {
        console.log('=== BACKUP PROCESS STARTED ===');
        console.log('Backup Type:', isManual ? 'Manual' : 'Automatic');

        // Use fixed filenames - one for manual, one for automatic
        const filename = isManual ? 'backup_manual.sql' : 'backup_automatic.sql';
        console.log('Filename:', filename);

        const backupsDir = path.join(process.cwd(), '..', 'backups');
        console.log('Backups Directory:', backupsDir);

        const backupPath = path.join(backupsDir, filename);
        console.log('Full Backup Path:', backupPath);

        // Create backups folder if it doesn't exist
        if (!fs.existsSync(backupsDir)) {
            console.log('Creating backups directory...');
            fs.mkdirSync(backupsDir, { recursive: true });
        } else {
            console.log('Backups directory already exists');
        }

        // Delete old backup file if it exists
        if (fs.existsSync(backupPath)) {
            console.log('Deleting old backup file...');
            fs.unlinkSync(backupPath);
        } else {
            console.log('No old backup file to delete');
        }

        // PostgreSQL backup command with full path
        const { PGUSER, PGHOST, PGDATABASE, PGPASSWORD, PGPORT } = process.env;

        console.log('=== DATABASE CONFIG ===');
        console.log('PGUSER:', PGUSER);
        console.log('PGHOST:', PGHOST);
        console.log('PGPORT:', PGPORT);
        console.log('PGDATABASE:', PGDATABASE);
        console.log('PGPASSWORD:', PGPASSWORD ? '***set***' : '***NOT SET***');

        const pgDumpPath = this.findPgDump();
        console.log('pg_dump Path:', pgDumpPath);

        // On Windows with a resolved path, verify the file exists
        if (process.platform === 'win32' && pgDumpPath !== 'pg_dump.exe' && !fs.existsSync(pgDumpPath)) {
            console.error('ERROR: pg_dump.exe not found!');
            console.error('Searched at:', pgDumpPath);
            throw new Error(`pg_dump.exe not found at: ${pgDumpPath}`);
        }

        console.log('✓ pg_dump found');

        // Quote the path on Windows (may contain spaces), plain on Linux
        const pgDumpCmd = process.platform === 'win32' ? `"${pgDumpPath}"` : pgDumpPath;
        const command = `${pgDumpCmd} -U ${PGUSER} -h ${PGHOST} -p ${PGPORT} -d ${PGDATABASE} -f "${backupPath}"`;
        console.log('=== EXECUTING COMMAND ===');
        console.log('Command:', command);

        try {
            console.log('Running pg_dump...');
            const result = await execPromise(command, {
                env: { ...process.env, PGPASSWORD }
            });

            console.log('Command stdout:', result.stdout);
            console.log('Command stderr:', result.stderr);

            if (!fs.existsSync(backupPath)) {
                console.error('ERROR: Backup file was not created!');
                throw new Error('Backup file was not created');
            }

            const stats = fs.statSync(backupPath);
            console.log('Backup file size:', stats.size, 'bytes');

            const resultData = {
                success: true,
                filename,
                type: isManual ? 'Manual' : 'Automatic',
                size: stats.size,
                path: backupPath,
                timestamp: new Date().toISOString()
            };

            console.log('=== BACKUP SUCCESS ===');
            console.log('Result:', resultData);

            return resultData;
        } catch (error) {
            const err = error as Error;
            console.error('=== BACKUP FAILED ===');
            console.error('Error message:', err.message);
            console.error('Error stack:', err.stack);
            throw new Error(`Backup failed: ${err.message}`);
        }
    }
}