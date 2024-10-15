import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class Migration1728168027693 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'medidor',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'customer_code',
            type: 'varchar',
          },
          {
            name: 'measure_value',
            type: 'decimal',
          },
          {
            name: 'measure_type',
            type: 'varchar',
          },
          {
            name: 'measure_dateTime',
            type: 'timestamp',
          },
          {
            name: 'image_url',
            type: 'varchar',
          },
          {
            name: 'has_confirmed',
            type: 'boolean',
            default: false,
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('medidor');
  }
}
