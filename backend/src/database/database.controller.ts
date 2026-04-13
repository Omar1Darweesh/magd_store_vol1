import { Controller, Post, Get, Query, Res, NotFoundException, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import * as fs from 'fs';
import { DatabaseService } from './database.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('database')
@UseGuards(JwtAuthGuard)
export class DatabaseController {
    constructor(private readonly databaseService: DatabaseService) { }

    /** Trigger a manual backup (saves on server) */
    @Post('backup')
    async createBackup() {
        return this.databaseService.createBackup(true);
    }

    /** Return metadata about the latest manual and automatic backups */
    @Get('backup/info')
    async getBackupInfo() {
        return this.databaseService.getBackupInfo();
    }

    /**
     * Download a backup file directly to the user's browser.
     * Query param: type = 'manual' (default) | 'automatic'
     */
    @Get('backup/download')
    async downloadBackup(
        @Query('type') type: 'manual' | 'automatic' = 'manual',
        @Res() res: Response,
    ) {
        const filePath = this.databaseService.getBackupFilePath(
            type === 'automatic' ? 'automatic' : 'manual',
        );

        if (!fs.existsSync(filePath)) {
            throw new NotFoundException(
                type === 'manual'
                    ? 'لا توجد نسخة احتياطية يدوية. قم بإنشائها أولاً.'
                    : 'لا توجد نسخة احتياطية تلقائية بعد. ستُنشأ يومياً في 9 مساءً.',
            );
        }

        const date = new Date().toISOString().split('T')[0];
        const downloadName = `magd_backup_${type}_${date}.sql`;
        res.download(filePath, downloadName);
    }
}
