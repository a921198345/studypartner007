// 法考标准科目定义
export const LAW_SUBJECTS = [
  { id: 'criminal_law', name: '刑法', value: '刑法' },
  { id: 'civil_law', name: '民法', value: '民法' },
  { id: 'criminal_procedure', name: '刑事诉讼法', value: '刑事诉讼法' },
  { id: 'civil_procedure', name: '民事诉讼法', value: '民事诉讼法' },
  { id: 'administrative_law', name: '行政法', value: '行政法' },
  { id: 'commercial_economic', name: '商经知', value: '商经知' },
  { id: 'three_countries', name: '三国法', value: '三国法' },
  { id: 'legal_theory', name: '理论法', value: '理论法' }
];

// 导出科目名称数组（用于兼容旧代码）
export const SUBJECT_NAMES = LAW_SUBJECTS.map(s => s.name);

// 导出科目ID到名称的映射
export const SUBJECT_ID_TO_NAME = LAW_SUBJECTS.reduce((acc, subject) => {
  acc[subject.id] = subject.name;
  return acc;
}, {});

// 导出名称到ID的映射
export const SUBJECT_NAME_TO_ID = LAW_SUBJECTS.reduce((acc, subject) => {
  acc[subject.name] = subject.id;
  return acc;
}, {});

// 科目映射表（用于数据迁移）
export const SUBJECT_MAPPING = {
  // 原名称 -> 新名称
  '商法': '商经知',
  '经济法': '商经知',
  '商法与经济法': '商经知',
  '法理学': '理论法',
  '理论法学': '理论法',
  '行政法': '行政法与行政诉讼法',
  '行政诉讼法': '行政法与行政诉讼法',
  '国际法': '三国法',
  '宪法': '理论法',
  '法制史': '理论法',
  '司法制度与法律职业道德': '理论法',
  '国际私法': '三国法',
  '国际经济法': '三国法',
  '国际公法': '三国法',
  '知识产权法': '商经知',
  '劳动法': '商经知',
  '环境资源法': '商经知',
  // 已经正确的保持不变
  '刑法': '刑法',
  '民法': '民法',
  '刑事诉讼法': '刑事诉讼法',
  '民事诉讼法': '民事诉讼法',
  '行政法': '行政法',
  '商经知': '商经知',
  '三国法': '三国法',
  '理论法': '理论法'
};