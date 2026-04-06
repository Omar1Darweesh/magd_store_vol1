import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Delete,
  Param,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto, UpdateExpenseDto, CreateExpenseCategoryDto, UpdateExpenseCategoryDto } from './dto/expenses.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('expenses')
@UseGuards(JwtAuthGuard)
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  // ============= Categories =============
  @Get('categories')
  findAllCategories(@Query('active') active?: string) {
    return this.expensesService.findAllCategories({
      active: active !== undefined ? active === 'true' : undefined,
    });
  }

  @Get('categories/:id')
  findOneCategory(@Param('id', ParseIntPipe) id: number) {
    return this.expensesService.findOneCategory(id);
  }

  @Post('categories')
  createCategory(@Body() dto: CreateExpenseCategoryDto) {
    return this.expensesService.createCategory(dto);
  }

  @Patch('categories/:id')
  updateCategory(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateExpenseCategoryDto,
  ) {
    return this.expensesService.updateCategory(id, dto);
  }

  @Patch('categories/:id/toggle-active')
  toggleCategoryActive(@Param('id', ParseIntPipe) id: number) {
    return this.expensesService.toggleCategoryActive(id);
  }

  @Delete('categories/:id')
  deleteCategory(@Param('id', ParseIntPipe) id: number) {
    return this.expensesService.deleteCategory(id);
  }

  // ============= Statistics =============
  @Get('stats')
  getStats(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.expensesService.getStats({ dateFrom, dateTo });
  }

  @Get('monthly-trend')
  getMonthlyTrend() {
    return this.expensesService.getMonthlyTrend();
  }

  @Get('export')
  exportExpenses(
    @Query('categoryId') categoryId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.expensesService.exportExpenses({
      categoryId: categoryId ? parseInt(categoryId) : undefined,
      dateFrom,
      dateTo,
    });
  }

  // ============= Expenses CRUD =============
  @Get()
  findAll(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('categoryId') categoryId?: string,
    @Query('search') search?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('paymentMethod') paymentMethod?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ) {
    return this.expensesService.findAll({
      skip: skip ? parseInt(skip) : undefined,
      take: take ? parseInt(take) : undefined,
      categoryId: categoryId ? parseInt(categoryId) : undefined,
      search,
      dateFrom,
      dateTo,
      paymentMethod,
      sortBy,
      sortOrder: sortOrder as 'asc' | 'desc',
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.expensesService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateExpenseDto, @Request() req: any) {
    return this.expensesService.create(dto, req.user.userId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateExpenseDto,
  ) {
    return this.expensesService.update(id, dto);
  }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.expensesService.delete(id);
  }
}
