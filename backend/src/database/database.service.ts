import { Injectable } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execPromise = promisify(exec);

@Injectable()
export class DatabaseService {
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

        const pgDumpPath = path.join(process.cwd(), '..', 'postgresql-portable', 'bin', 'pg_dump.exe');
        console.log('pg_dump.exe Path:', pgDumpPath);

        // Check if pg_dump exists
        if (!fs.existsSync(pgDumpPath)) {
            console.error('ERROR: pg_dump.exe not found!');
            console.error('Searched at:', pgDumpPath);
            console.error('Current working directory:', process.cwd());
            throw new Error(`pg_dump.exe not found at: ${pgDumpPath}`);
        }

        console.log('✓ pg_dump.exe found');

        const command = `"${pgDumpPath}" -U ${PGUSER} -h ${PGHOST} -p ${PGPORT} -d ${PGDATABASE} -f "${backupPath}"`;
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
            console.error('=== BACKUP FAILED ===');
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
            throw new Error(`Backup failed: ${error.message}`);
        }
    }
}