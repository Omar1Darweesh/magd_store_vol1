import { Controller, Post, UseGuards } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('database')
@UseGuards(JwtAuthGuard)
export class DatabaseController {
    constructor(private readonly databaseService: DatabaseService) { }

    @Post('backup')
    async createBackup() {
        // Pass true for manual backup
        return this.databaseService.createBackup(true);
    }
}
