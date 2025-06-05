/**
 * 创建法律文档分段存储表
 */

exports.up = function(knex) {
  return knex.schema
    .createTable('law_segments', function(table) {
      table.increments('id').primary();
      table.string('law_name', 255).notNullable().comment('法律名称');
      table.string('book', 255).nullable().comment('编');
      table.string('chapter', 255).nullable().comment('章');
      table.string('section', 255).nullable().comment('节');
      table.string('article', 255).nullable().comment('条');
      table.string('paragraph', 255).nullable().comment('款');
      table.string('item', 255).nullable().comment('项');
      table.text('content', 'longtext').notNullable().comment('分段内容');
      table.integer('token_count').unsigned().default(0).comment('估算token数量');
      table.text('key_concepts', 'longtext').nullable().comment('关键概念, JSON格式');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      // 添加索引
      table.index('law_name');
      table.index('article');
      table.index(['law_name', 'article']);
      table.index(['law_name', 'chapter']);
    })
    .createTable('law_segment_vectors', function(table) {
      table.increments('id').primary();
      table.integer('segment_id').unsigned().notNullable().comment('关联的分段ID');
      table.text('vector', 'longtext').notNullable().comment('向量数据, JSON格式');
      table.string('embedding_model', 255).notNullable().comment('嵌入模型名称');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      
      // 外键关联
      table.foreign('segment_id').references('id').inTable('law_segments').onDelete('CASCADE');
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('law_segment_vectors')
    .dropTableIfExists('law_segments');
}; 