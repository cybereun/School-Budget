/* 학교회계 예산현황판
 * 모든 파일 처리는 File API + SheetJS로 브라우저 안에서만 수행합니다.
 */

const app = document.querySelector('#app');
const fileInput = document.querySelector('#file-input');
const PLAN_KEY = 'school-budget-viewer-plans-v1';
const DATA_KEY = 'school-budget-viewer-data-v1';
const UNASSIGNED_MANAGER = '__unassigned__';

const icons = {
  chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19V5"/><path d="M4 19h16"/><path d="M8 16v-5"/><path d="M12 16V7"/><path d="M16 16v-8"/></svg>',
  upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4"/><path d="m8 8 4-4 4 4"/><path d="M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/><path d="M12 14v2"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/></svg>',
  info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8h.01"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c.8-3.3 3.1-5 7-5s6.2 1.7 7 5"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m7 7 10 10M17 7 7 17"/></svg>',
  file: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h13"/><path d="m13 6 6 6-6 6"/></svg>',
  chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>'
};

const demoRows = [
  row('교육활동 운영', '학생참여수업', '교육운영비', '수업자료 및 교구 구입', 32400000, 11800000, 7100000),
  row('교육활동 운영', '학생참여수업', '일반수용비', '프로젝트 수업 재료비', 19800000, 6500000, 6500000),
  row('학생복지', '학생맞춤형복지비', '맞춤형복지비', '학생 교육복지 지원', 38690000, 5920000, 5200000),
  row('학생복지', '교직원체육문화행사', '교직원복지비', '교직원 소통·회복활동', 20000000, 7200000, 7200000),
  row('학교운영', '학교운영위원회', '업무추진비', '학교운영위원회 협의', 12800000, 3600000, 2800000),
  row('학교운영', '학부모회 운영', '업무추진비', '학부모 교육활동 간담회', 8600000, 3200000, 2400000),
  row('교직원 인건비', '봉급', '인건비', '기본급 및 수당', 2362237000, 698151900, 523122100),
  row('교직원 인건비', '정액수당', '교직원수당', '정근수당가산금', 38080000, 12420000, 9290000),
  row('학교시설 관리', '시설장비 유지', '수선유지비', '시설물 안전 점검 및 수선', 45200000, 17800000, 15400000),
  row('학교시설 관리', '공공요금', '공공요금', '전기·가스·상하수도 요금', 92500000, 48600000, 45100000),
  row('급식 운영', '학교급식 운영', '급식재료비', '식재료 구입', 155000000, 89200000, 84700000),
  row('교육행정', '일반행정 운영', '일반수용비', '사무용품 및 행정 소모품', 17500000, 7400000, 6700000)
];

function row(business, item, cost, detail, budget, committed, paid) {
  return { id: `demo-${business}-${item}-${detail}`, sourceType: 'business', sourceName: '예시 데이터', sheet: '예시', rowNumber: 0, policy: '학교회계', unit: business, business, item, cost, detail, budget, committed, paid, remaining: Math.max(0, budget - paid), planned: 0, manager: '예산 담당자' };
}

const state = {
  rows: [],
  hasData: false,
  isDemo: false,
  sourceName: '',
  sourceType: 'business',
  sourceSheet: '',
  uploadMode: 'business',
  view: 'overview',
  level: 'business',
  exploreMode: 'graph',
  expandedKeys: new Set(),
  sort: 'remaining-desc',
  status: 'all',
  cost: 'all',
  manager: 'all',
  search: '',
  selectedId: demoRows[0].id,
  toast: '',
  modal: false,
  busy: false,
  schoolwideRows: []
};

let toastTimer;
let searchTimer;
const getPlans = () => {
  try { return JSON.parse(localStorage.getItem(PLAN_KEY) || '{}'); } catch { return {}; }
};
const savePlans = plans => localStorage.setItem(PLAN_KEY, JSON.stringify(plans));

function saveDataset() {
  try {
    localStorage.setItem(DATA_KEY, JSON.stringify({
      version: 1,
      rows: state.rows,
      schoolwideRows: state.schoolwideRows,
      sourceName: state.sourceName,
      sourceType: state.sourceType,
      sourceSheet: state.sourceSheet
    }));
    return true;
  } catch {
    return false;
  }
}

function restoreDataset() {
  try {
    const saved = JSON.parse(localStorage.getItem(DATA_KEY) || 'null');
    if (!saved || (!Array.isArray(saved.rows) && !Array.isArray(saved.schoolwideRows))) return;
    const plans = getPlans();
    state.rows = Array.isArray(saved.rows) ? saved.rows.map(item => ({ ...item, planned: numberValue(plans[item.id]?.amount || item.planned) })) : [];
    state.schoolwideRows = Array.isArray(saved.schoolwideRows) ? saved.schoolwideRows : [];
    if (!state.rows.length && !state.schoolwideRows.length) return;
    state.sourceName = saved.sourceName || '';
    state.sourceType = saved.sourceType || 'business';
    state.sourceSheet = saved.sourceSheet || '';
    state.hasData = true;
    state.isDemo = false;
    state.manager = 'all';
    state.search = '';
    state.cost = 'all';
    state.status = 'all';
    state.level = 'business';
    state.exploreMode = 'graph';
    state.expandedKeys.clear();
    state.selectedId = state.rows[0]?.id || '';
    state.view = state.sourceType === 'schoolwide' ? 'schoolwide' : 'overview';
  } catch {
    localStorage.removeItem(DATA_KEY);
  }
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
}

function normalize(value) {
  return String(value ?? '').toLowerCase().replace(/[\s\u00a0_\-()[\]{}:./·,]/g, '');
}

function numberValue(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value instanceof Date) return value.getTime();
  const raw = String(value ?? '').trim();
  if (!raw) return 0;
  const isNegative = /^\(.*\)$/.test(raw) || raw.includes('-');
  const parsed = Number(raw.replace(/[₩원,%\s,()\u00a0]/g, '').replace(/[^\d.]/g, '')) || 0;
  return isNegative ? -parsed : parsed;
}

function formatWon(value) {
  const number = Math.round(Number(value) || 0);
  return `${number.toLocaleString('ko-KR')}원`;
}

function formatCompact(value) {
  const number = Math.round(Number(value) || 0);
  const abs = Math.abs(number);
  const sign = number < 0 ? '-' : '';
  if (abs >= 100000000) return `${sign}${Math.floor(abs / 100000000).toLocaleString('ko-KR')}억 ${Math.round((abs % 100000000) / 10000).toLocaleString('ko-KR')}만원`;
  if (abs >= 10000) return `${sign}${Math.round(abs / 10000).toLocaleString('ko-KR')}만원`;
  return formatWon(number);
}

function percent(part, whole) {
  if (!whole) return 0;
  return Math.max(0, Math.min(100, (part / whole) * 100));
}

function aggregate(rows) {
  const summary = rows.reduce((sum, item) => ({
    budget: sum.budget + item.budget,
    committed: sum.committed + item.committed,
    paid: sum.paid + item.paid,
    remaining: sum.remaining + item.remaining,
    available: sum.available,
    planned: sum.planned + item.planned
  }), { budget: 0, committed: 0, paid: 0, remaining: 0, available: 0, planned: 0 });
  summary.available = currentBalance(summary);
  return summary;
}

function summaryRows(rows) {
  const byKey = new Map();
  rows.forEach(item => {
    const key = state.level === 'business' ? item.business : state.level === 'item' ? `${item.business}||${item.item}` : item.id;
    if (!byKey.has(key)) byKey.set(key, { ...item, id: state.level === 'detail' ? item.id : `group-${key}`, sourceId: item.id, count: 0, budget: 0, committed: 0, paid: 0, remaining: 0, available: 0, planned: 0 });
    const group = byKey.get(key);
    group.count += 1;
    group.budget += item.budget;
    group.committed += item.committed;
    group.paid += item.paid;
    group.remaining += item.remaining;
    group.available += currentBalance(item);
    group.planned += item.planned;
    group.manager = mergeManagers(group.manager, item.manager);
    if (state.level !== 'detail') {
      if (state.level === 'business') { group.item = `${group.count}개 세부항목`; group.detail = '세부항목을 묶어 표시'; }
      else { group.business = item.business; group.item = item.item; group.detail = `${group.count}개 산출내역`; }
    }
  });
  return sortRows([...byKey.values()].map(group => ({ ...group, available: currentBalance(group) })));
}

function sortText(value) {
  return String(value || '').trim();
}

function sortRows(rows, level = state.level) {
  const sorted = [...rows];
  const compareText = (a, b) => sortText(a).localeCompare(sortText(b), 'ko', { numeric: true, sensitivity: 'base' });
  sorted.sort((a, b) => {
    switch (state.sort) {
      case 'name-asc': return compareText(level === 'detail' ? a.detail : level === 'item' ? a.item : a.business, level === 'detail' ? b.detail : level === 'item' ? b.item : b.business);
      case 'name-desc': return compareText(level === 'detail' ? b.detail : level === 'item' ? b.item : b.business, level === 'detail' ? a.detail : level === 'item' ? a.item : a.business);
      case 'business-asc': return compareText(a.business, b.business) || compareText(a.item, b.item) || compareText(a.detail, b.detail);
      case 'business-desc': return compareText(b.business, a.business) || compareText(b.item, a.item) || compareText(b.detail, a.detail);
      case 'item-asc': return compareText(a.item, b.item) || compareText(a.business, b.business) || compareText(a.detail, b.detail);
      case 'item-desc': return compareText(b.item, a.item) || compareText(b.business, a.business) || compareText(b.detail, a.detail);
      case 'remaining-asc': return (a.available ?? currentBalance(a)) - (b.available ?? currentBalance(b));
      case 'remaining-desc':
      default: return (b.available ?? currentBalance(b)) - (a.available ?? currentBalance(a));
    }
  });
  return sorted;
}

function getFilteredRows(rows = state.rows) {
  const query = normalize(state.search);
  const selectedManager = normalize(state.manager === 'all' ? '' : state.manager);
  return rows.filter(item => {
    const text = normalize([item.policy, item.unit, item.business, item.item, item.cost, item.detail, item.manager].join(' '));
    const matchesSearch = !query || text.includes(query);
    const matchesCost = state.cost === 'all' || item.cost === state.cost;
    const matchesManager = !selectedManager || (selectedManager === normalize(UNASSIGNED_MANAGER) ? !managerNames(item.manager).length : managerNames(item.manager).some(name => normalize(name) === selectedManager));
    const rate = percent(item.paid, item.budget);
    const available = currentBalance(item);
    const matchesStatus = state.status === 'all' || (state.status === 'remaining' && available > 0) || (state.status === 'urgent' && available > 0 && rate >= 85) || (state.status === 'done' && available <= 0);
    return matchesSearch && matchesCost && matchesManager && matchesStatus;
  });
}

function managerNames(value) {
  const raw = String(value || '').trim();
  if (!raw || ['미지정', '담당자 없음', '담당자없음', '없음', '-', '—'].includes(raw)) return [];
  return raw.split(/[,，\n/;|·]+/).map(name => name.trim()).filter(Boolean);
}

function managerOptions(rows = state.rows) {
  const names = [...new Set(rows.flatMap(item => managerNames(item.manager)))].sort((a, b) => a.localeCompare(b, 'ko'));
  if (rows.some(item => !managerNames(item.manager).length)) names.push(UNASSIGNED_MANAGER);
  return names;
}

function managerLabel(value) {
  return managerNames(value).join(', ') || '담당자 미지정';
}

function mergeManagers(...values) {
  return [...new Set(values.flatMap(value => managerNames(value)))].join(', ');
}

function findSelected() {
  return state.rows.find(item => item.id === state.selectedId) || state.rows[0] || null;
}

function statCard(label, value, foot, icon, primary = false) {
  const displayValue = typeof value === 'string' ? value : formatCompact(value);
  return `<div class="stat-card${primary ? ' primary' : ''}"><div class="stat-label"><span class="stat-icon">${icon}</span>${label}</div><div class="stat-value">${displayValue}</div><div class="stat-foot">${foot}</div></div>`;
}

function currentBalance(value) {
  return Math.max(0, Number(value?.budget || 0) - Number(value?.committed || 0));
}

function waitingPayment(value) {
  return Math.max(0, Number(value?.committed || 0) - Number(value?.paid || 0));
}

function renderHeader() {
  const dataActions = state.hasData ? `<button class="header-action" data-action="upload-business">${icons.file} 자료 변경</button><button class="header-action danger" data-action="reset">자료 비우기</button>` : '';
  return `<header class="app-header"><div class="brand"><div class="brand-mark">${icons.chart}</div><div class="brand-title"><strong>학교회계 예산현황판</strong><span>학교 예산 흐름을 한눈에</span></div></div><div class="header-actions"><div class="privacy-badge">${icons.lock}<span>서버 전송 없음</span></div>${dataActions}<button class="header-action" data-action="help">${icons.info} 도움말</button></div></header>`;
}

function renderCrumb() {
  return `<div class="crumb-row"><span class="crumb-dot"></span><span>내 사업 분석</span><span class="crumb-sep">›</span><span>예산 흐름</span><span class="source-pill">${labelForSource(state.sourceType)}</span></div>`;
}

function labelForSource(type) {
  return type === 'schoolwide' ? '학교 전체 자료' : type === 'revenue' ? '세입실적 자료' : '사업관리카드';
}

function renderHero(summary) {
  if (!state.hasData) return '';
  return `<section class="hero"><div class="hero-card hero-copy"><div class="eyebrow"><span class="spark"></span>${state.isDemo ? '예시 데이터로 둘러보기' : '예산 자료 분석 완료'}</div><h1>${state.isDemo ? '학교 예산, 지금 어디에<br><span>얼마나 남았을까요?</span>' : '내 사업 분석<br><span>지금 남은 예산부터 확인하세요.</span>'}</h1><p>${state.isDemo ? '사업관리카드 파일을 불러오면 예산현액부터 원인행위, 지급액, 계획 잔액까지 같은 화면에서 이어서 확인할 수 있어요.' : '현재 잔액을 먼저 보여주고, 앞으로 쓸 계획이 있을 때만 반영 후 잔액을 함께 보여드립니다. 세부사업·세부항목·산출내역까지 필요한 만큼 펼쳐서 확인할 수 있어요.'}</p><div class="hero-notes"><span class="note-chip"><b>1</b>파일 선택</span><span class="note-chip"><b>2</b>자동 분석</span><span class="note-chip"><b>3</b>잔액 확인</span><span class="note-chip"><b>4</b>집행계획 입력</span></div></div><div class="hero-card upload-card"><div><h3>다른 사업 자료를 볼까요?</h3><p>사업관리카드(예산·현액) 파일을 다시 선택하면 새 자료로 자동 분석합니다.</p></div><div class="dropzone" data-dropzone><div class="drop-icon">${icons.upload}</div><strong>엑셀 파일을 끌어놓으세요</strong><span>.xlsx · .xls · .csv · .ods · 서버로 전송하지 않음</span></div><div class="upload-actions"><button class="upload-btn" data-action="upload-business">${icons.upload} 다른 파일 선택</button></div></div></section>`;
}

function renderStats(summary) {
  const useRate = percent(summary.paid, summary.budget);
  const balance = currentBalance(summary);
  return `<section class="headline-grid"><div class="balance-hero-card"><div class="balance-kicker">지금 바로 확인할 금액</div><div class="balance-label">현재 잔액</div><strong class="balance-value">${formatCompact(balance)}</strong><div class="balance-foot"><span>전체 예산 ${formatCompact(summary.budget)}</span><span>사용 결정 ${formatCompact(summary.committed)}</span></div></div><div class="headline-breakdown"><div class="headline-stat"><span>전체 예산</span><small>예산현액</small><strong>${formatCompact(summary.budget)}</strong></div><div class="headline-stat"><span>사용 결정</span><small>원인행위액</small><strong>${formatCompact(summary.committed)}</strong></div><div class="headline-stat"><span>지급 완료</span><small>지급액 · 집행률 ${useRate.toFixed(1)}%</small><strong>${formatCompact(summary.paid)}</strong></div><div class="headline-stat"><span>지급 대기</span><small>사용 결정액 중 아직 지급하지 않은 금액</small><strong>${formatCompact(waitingPayment(summary))}</strong></div></div></section>`;
}

function renderNav(activeCount = state.rows.length) {
  return `<div class="section-nav"><nav class="nav-tabs"><button class="nav-tab${state.view === 'overview' ? ' active' : ''}" data-view="overview">전체 예산</button><button class="nav-tab${state.view === 'explore' ? ' active' : ''}" data-view="explore">사업 탐색</button><button class="nav-tab${state.view === 'planning' ? ' active' : ''}" data-view="planning">집행 계획</button></nav><div class="nav-context">${activeCount.toLocaleString('ko-KR')}개 항목 · ${state.isDemo ? '예시' : '로컬 분석'}</div></div>`;
}

function renderManagerFilter(rows = state.rows) {
  const managers = managerOptions(rows);
  if (!managers.length) return '';
  const visibleRows = getFilteredRows(rows);
  const managerSummary = aggregate(visibleRows);
  const selectedLabel = state.manager === 'all' ? '전체 사업' : state.manager === UNASSIGNED_MANAGER ? '담당자 미지정' : state.manager;
  return `<section class="manager-filter panel"><div class="manager-filter-intro"><div class="manager-filter-icon">${icons.user}</div><div><div class="section-kicker">담당자별 예산 보기</div><h2>담당자를 찾으면 금액도 바로 보여요</h2><p>엑셀의 세부항목 담당자 열을 기준으로 연결합니다. 여러 명이 적힌 항목은 각 담당자에게 함께 표시됩니다.</p></div></div><label class="manager-select"><span>${icons.user} 담당자</span><select data-filter="manager"><option value="all" ${state.manager === 'all' ? 'selected' : ''}>전체 사업</option>${managers.map(manager => `<option value="${esc(manager)}" ${state.manager === manager ? 'selected' : ''}>${manager === UNASSIGNED_MANAGER ? '담당자 미지정' : esc(manager)}</option>`).join('')}</select></label><div class="manager-metrics"><div><span>확인 항목</span><strong>${visibleRows.length.toLocaleString('ko-KR')}개</strong></div><div><span>예산현액</span><strong>${formatCompact(managerSummary.budget)}</strong></div><div><span>지급액</span><strong>${formatCompact(managerSummary.paid)}</strong></div><div class="highlight"><span>${esc(selectedLabel)} 현재 잔액</span><strong>${formatCompact(managerSummary.available)}</strong></div></div></section>`;
}

function renderRankedList(rows) {
  const groups = [...rows].sort((a,b) => b.remaining - a.remaining).slice(0, 7);
  if (!groups.length) return '<div class="empty-inline">현재 조건에 맞는 항목이 없습니다.</div>';
  return `<div class="rank-list">${groups.map((item, index) => {
    const rate = percent(item.paid, item.budget);
    return `<button class="rank-item" data-row-id="${esc(item.sourceId || item.id)}"><span class="rank-num${index < 3 ? ' top' : ''}">${index + 1}</span><span class="rank-name"><strong>${esc(item.business)}</strong><span>${esc(item.item)} · ${esc(item.cost)}</span></span><span class="progress-wrap"><span class="progress-bar"><span class="progress-fill${rate < 40 ? ' mint' : ''}" style="width:${rate}%"></span></span><span class="progress-caption"><span>지급 ${formatCompact(item.paid)}</span><span>${rate.toFixed(1)}% 집행</span></span></span><span class="rank-amount"><strong>${formatCompact(item.remaining)}</strong><span>현재 잔액</span></span></button>`;
  }).join('')}</div>`;
}

function renderFlow(summary) {
  const wait = Math.max(0, summary.committed - summary.paid);
  const notCommitted = Math.max(0, summary.budget - summary.committed);
  const budget = summary.budget || 1;
  const paidRate = percent(summary.paid, budget);
  const waitRate = percent(wait, budget);
  const notCommittedRate = percent(notCommitted, budget);
  return `<section class="panel infographic-panel"><div class="panel-header"><div><div class="section-kicker">한눈에 보는 예산 흐름</div><h2 class="panel-title">전체 예산 중 어디까지 사용했을까요?</h2><p class="panel-description">지급 완료·지급 대기·아직 사용하지 않은 금액을 한 막대에서 비교합니다.</p></div></div><div class="infographic-body"><div class="infographic-total"><strong>${formatCompact(summary.budget)}</strong><span>전체 예산현액</span></div><div class="big-flow-bar" aria-label="예산 사용 현황"><div class="flow-segment paid" style="width:${paidRate}%"><span>지급 완료</span></div><div class="flow-segment waiting" style="width:${waitRate}%"><span>지급 대기</span></div><div class="flow-segment unused" style="width:${notCommittedRate}%"><span>미사용</span></div></div><div class="flow-legend"><div><i class="legend-dot paid"></i><span>지급 완료</span><strong>${formatCompact(summary.paid)}</strong><em>${paidRate.toFixed(1)}%</em></div><div><i class="legend-dot waiting"></i><span>지급 대기</span><strong>${formatCompact(wait)}</strong><em>${waitRate.toFixed(1)}%</em></div><div><i class="legend-dot unused"></i><span>미사용</span><strong>${formatCompact(notCommitted)}</strong><em>${notCommittedRate.toFixed(1)}%</em></div></div><div class="flow-explain"><div><strong>원인행위액</strong><span>사용하기로 결정한 금액 · ${formatCompact(summary.committed)}</span></div><div><strong>지급 후 잔액</strong><span>지급액을 제외하고 남은 금액 · ${formatCompact(summary.remaining)}</span></div></div></div></section>`;
}

function renderStageCompare(summary) {
  const commitmentRate = percent(summary.committed, summary.budget);
  const paidRate = percent(summary.paid, summary.budget);
  return `<section class="panel stage-panel"><div class="panel-header stage-panel-header"><div><div class="section-kicker">집행 단계 확인</div><h2 class="panel-title">예산이 어느 단계까지 갔는지 비교해 보세요</h2><p class="panel-description">원인행위와 지급 완료를 전체 예산 기준으로 나누어 보여줍니다.</p></div></div><div class="stage-grid"><div class="stage-card commitment"><div class="stage-card-head"><div><span>이미 사용하기로 한 금액</span><h3>원인행위 기준</h3></div><strong>${commitmentRate.toFixed(1)}%</strong></div><div class="stage-bar"><span style="width:${commitmentRate}%"></span></div><div class="stage-values"><div><span>원인행위액</span><strong>${formatCompact(summary.committed)}</strong></div><div><span>현재 사용 가능</span><strong>${formatCompact(currentBalance(summary))}</strong></div></div></div><div class="stage-card paid"><div class="stage-card-head"><div><span>실제로 지급한 금액</span><h3>지급 기준</h3></div><strong>${paidRate.toFixed(1)}%</strong></div><div class="stage-bar"><span style="width:${paidRate}%"></span></div><div class="stage-values"><div><span>지급액</span><strong>${formatCompact(summary.paid)}</strong></div><div><span>지급 전 금액 포함 잔액</span><strong>${formatCompact(summary.remaining)}</strong></div></div></div></div></section>`;
}

function businessGroups(rows = state.rows) {
  const map = new Map();
  rows.forEach(item => {
    const name = item.business || item.unit || item.item || '분류 없음';
    if (!map.has(name)) map.set(name, { name, count: 0, budget: 0, committed: 0, paid: 0, remaining: 0, available: 0 });
    const group = map.get(name);
    group.count += 1;
    group.budget += item.budget;
    group.committed += item.committed;
    group.paid += item.paid;
    group.remaining += item.remaining;
    group.available += currentBalance(item);
  });
  return [...map.values()].map(group => ({ ...group, available: currentBalance(group) })).sort((a, b) => b.available - a.available);
}

function renderCategoryBars(rows) {
  if (!rows.length) return '<section class="panel category-panel"><div class="empty-inline">현재 조건에 맞는 사업이 없습니다.</div></section>';
  const maxRemaining = Math.max(...rows.map(item => item.available), 1);
  return `<section class="panel category-panel"><div class="panel-header"><div><div class="section-kicker">세부사업 기준 · Top 7</div><h2 class="panel-title">어디에 돈이 남아 있나요?</h2><p class="panel-description">현재 잔액이 큰 세부사업 7개를 먼저 보여줍니다. 막대 길이가 길수록 남은 금액이 큽니다.</p></div></div><div class="category-list">${rows.slice(0, 7).map((item, index) => { const rate = percent(item.paid, item.budget); const remainRate = percent(item.available, item.budget); return `<button class="category-row" data-row-id="${esc(state.rows.find(row => row.business === item.name)?.id || '')}"><div class="category-head"><div class="category-name"><span class="category-rank">${index + 1}</span><strong>${esc(item.name)}</strong><span>${item.count}개 항목 · 예산 ${formatCompact(item.budget)}</span></div><div class="category-amount"><strong>${formatCompact(item.available)}</strong><span>현재 잔액 ${remainRate.toFixed(1)}%</span></div></div><div class="category-bar"><span style="width:${(item.available / maxRemaining) * 100}%"></span></div><div class="category-foot"><span>지급 ${formatCompact(item.paid)}</span><span>집행률 ${rate.toFixed(1)}%</span></div></button>`; }).join('')}</div></section>`;
}

function renderDetailPanel() {
  const item = findSelected();
  if (!item) return `<aside class="panel detail-panel"><div class="empty-inline">항목을 선택하면 상세 정보가 표시됩니다.</div></aside>`;
  const plans = getPlans();
  const plan = plans[item.id] || { amount: item.planned || '', date: '미정', note: '' };
  const available = currentBalance(item);
  const expected = Math.max(0, available - numberValue(plan.amount));
  return `<aside class="panel detail-panel"><div class="panel-header"><div><div class="section-kicker">선택한 항목</div><h2 class="panel-title">예산 상세</h2><p class="panel-description">현재 잔액과 앞으로 사용할 금액을 함께 봅니다.</p></div><button class="close-btn" data-action="clear-selection" aria-label="선택 해제">${icons.close}</button></div><div class="detail-body"><div class="detail-title"><div><strong>${esc(item.business)}</strong><span>${esc(item.item)} · ${esc(item.cost)}<br>${esc(item.detail)}<br><b class="manager-line">담당자: ${esc(managerLabel(item.manager))}</b></span></div><span class="source-pill">${state.sourceType === 'schoolwide' ? '학교 전체 자료' : '사업관리카드'}</span></div><div class="amount-stack"><div class="amount-row"><span>예산현액</span><strong>${formatWon(item.budget)}</strong></div><div class="amount-row"><span>원인행위액</span><strong>${formatWon(item.committed)}</strong></div><div class="amount-row"><span>지급액</span><strong>${formatWon(item.paid)}</strong></div><div class="amount-row highlight"><span>현재 잔액</span><strong>${formatWon(available)}</strong></div></div><div class="plan-form"><label class="form-label" for="plan-amount">앞으로 사용할 금액</label><div class="field-row"><input class="input input-number" id="plan-amount" inputmode="numeric" data-plan-field="amount" value="${esc(plan.amount)}" placeholder="0" /><select class="select" data-plan-field="date"><option ${plan.date === '미정' ? 'selected' : ''}>미정</option><option ${plan.date === '1개월 내' ? 'selected' : ''}>1개월 내</option><option ${plan.date === '이번 분기' ? 'selected' : ''}>이번 분기</option><option ${plan.date === '학기 내' ? 'selected' : ''}>학기 내</option></select></div><label class="form-label" for="plan-note" style="margin-top:14px">메모</label><textarea class="input textarea" id="plan-note" data-plan-field="note" placeholder="예: 교구 구입 2회, 9월 집행">${esc(plan.note)}</textarea><div class="form-help">입력 후 예상 잔액은 <strong data-detail-plan-preview>${formatWon(expected)}</strong>입니다. 계획과 메모는 현재 브라우저에만 저장됩니다.</div><button class="apply-btn" data-action="save-plan">계획 반영</button><div class="local-note">${icons.lock} 엑셀과 입력 내용은 서버로 전송되지 않습니다.</div></div></div></aside>`;
}

function renderOverview(summary) {
  const groups = businessGroups(getFilteredRows());
  return `<div class="overview-grid"><div>${renderFlow(summary)}${renderStageCompare(summary)}${renderCategoryBars(groups)}</div><div class="side-stack">${renderDetailPanel()}${renderOperationsCard()}</div></div>`;
}

function renderOperationsCard() {
  const rows = state.rows.filter(item => normalize(item.cost).includes('업무추진비'));
  const sum = aggregate(rows);
  const planned = rows.reduce((total, item) => total + numberValue(getPlans()[item.id]?.amount || item.planned), 0);
  return `<section class="panel mini-card"><div class="mini-head"><strong>업무추진비 계획</strong><span>${rows.length ? `${rows.length}개 항목` : '자료 없음'}</span></div><div class="mini-number">${formatCompact(sum.available)}</div><div class="mini-caption">현재 잔액 · 계획 ${formatCompact(planned)}</div><div class="mini-progress"><div style="width:${percent(planned, sum.available)}%"></div></div><div class="progress-caption"><span>집행 가능한 잔액</span><span>${percent(planned, sum.available).toFixed(0)}% 계획</span></div></section>`;
}

function renderExplore() {
  const rows = getFilteredRows();
  const groups = summaryRows(rows);
  const costs = [...new Set(state.rows.map(item => item.cost).filter(Boolean))].sort();
  const levelLabels = { business: '세부사업', item: '세부항목', detail: '산출내역' };
  const sortOptions = [
    ['name-asc', '이름 가나다순'], ['name-desc', '이름 역순'],
    ['business-asc', '세부사업 가나다순'], ['business-desc', '세부사업 역순'],
    ['item-asc', '세부항목 가나다순'], ['item-desc', '세부항목 역순'],
    ['remaining-desc', '현재 잔액 많은 순'], ['remaining-asc', '현재 잔액 적은 순']
  ];
  return `<section class="panel explore-panel"><div class="panel-header"><div><div class="section-kicker">예산 상세</div><h2 class="panel-title">보고 싶은 단위로 찾아보세요</h2><p class="panel-description">세부사업을 누르면 세부항목이, 세부항목을 누르면 산출내역이 바로 아래에 펼쳐집니다.</p></div><button class="outline-btn" data-action="upload-business">자료 변경</button></div><div class="explore-toolbar"><div class="explore-controls"><div class="segmented">${Object.entries(levelLabels).map(([key, label]) => `<button class="segment${state.level === key ? ' active' : ''}" data-level="${key}">${label}</button>`).join('')}</div><div class="view-switch"><span>화면</span><button class="view-switch-btn${state.exploreMode === 'graph' ? ' active' : ''}" data-explore-mode="graph">그래프로 보기</button><button class="view-switch-btn${state.exploreMode === 'plan' ? ' active' : ''}" data-explore-mode="plan">계획 입력하기</button></div></div><div class="filter-area"><select class="filter-select" data-filter="cost"><option value="all">전체 비목</option>${costs.map(cost => `<option value="${esc(cost)}" ${state.cost === cost ? 'selected' : ''}>${esc(cost)}</option>`).join('')}</select><select class="filter-select" data-filter="status"><option value="all" ${state.status === 'all' ? 'selected' : ''}>전체 상태</option><option value="remaining" ${state.status === 'remaining' ? 'selected' : ''}>잔액 있음</option><option value="urgent" ${state.status === 'urgent' ? 'selected' : ''}>집행률 85% 이상</option><option value="done" ${state.status === 'done' ? 'selected' : ''}>집행 완료</option></select><select class="filter-select sort-select" data-filter="sort">${sortOptions.map(([value, label]) => `<option value="${value}" ${state.sort === value ? 'selected' : ''}>${label}</option>`).join('')}</select><div class="search-box-wrap" style="position:relative; flex:0 1 205px"><span style="position:absolute;left:10px;top:10px;color:#9aa5bc;width:14px;height:14px">${icons.search}</span><input class="search-box" data-filter="search" value="${esc(state.search)}" placeholder="사업·산출내역 검색" style="padding-left:30px;width:100%" /></div></div></div>${state.exploreMode === 'graph' ? renderExploreGraph(groups, rows) : renderExplorePlan(groups)}</section>`;
}

function renderExploreGraph(groups, rows) {
  if (!groups.length) return '<div class="empty-inline">검색 조건에 맞는 예산 항목이 없습니다.</div>';
  return `<div class="graph-summary"><div><strong>${groups.length.toLocaleString('ko-KR')}개</strong><span>${state.level === 'business' ? '세부사업' : state.level === 'item' ? '세부항목' : '산출내역'}을 현재 잔액 기준으로 비교합니다.</span></div><div class="graph-legend"><span><i class="tone-dot high"></i>잔액 60% 이상</span><span><i class="tone-dot mid"></i>잔액 30~60%</span><span><i class="tone-dot low"></i>잔액 30% 미만</span></div></div><div class="explore-graph-list">${groups.map(item => renderGraphCard(item, rows)).join('')}</div>`;
}

function renderGraphCard(item, rows) {
  const available = item.available ?? currentBalance(item);
  const remainRate = percent(available, item.budget);
  const usedRate = percent(item.committed, item.budget);
  const tone = remainRate >= 60 ? 'high' : remainRate >= 30 ? 'mid' : 'low';
  const key = `graph:${state.level}:${item.id}`;
  const isExpanded = state.expandedKeys.has(key);
  const canExpand = state.level !== 'detail';
  const title = state.level === 'detail' ? item.detail : state.level === 'item' ? item.item : item.business;
  const subtitle = state.level === 'detail' ? `${item.business} · ${item.item} · ${item.cost}` : state.level === 'item' ? `${item.business} · ${item.count}개 산출내역` : `${item.count}개 세부항목`;
  const action = state.level === 'detail' ? `<button class="graph-action" data-action="enter-plan" data-row-id="${esc(item.sourceId || item.id)}">계획 입력 ${icons.chevron}</button>` : `<span class="graph-action">${isExpanded ? '산출내역 접기' : '세부항목 보기'} ${icons.chevron}</span>`;
  return `<article class="graph-card tone-${tone}${isExpanded ? ' is-expanded' : ''}" ${canExpand ? `data-expand-key="${esc(key)}"` : `data-row-id="${esc(item.sourceId || item.id)}"`}><div class="graph-card-main"><div class="graph-card-title"><span class="graph-context">${esc(subtitle)}</span><h3>${esc(title || '이름 없음')}</h3><span class="graph-manager">담당자: ${esc(managerLabel(item.manager))}</span></div><div class="graph-card-balance"><span>현재 잔액</span><strong>${formatWon(available)}</strong><em>${remainRate.toFixed(1)}% 남음</em></div><div class="graph-card-progress"><div class="graph-track"><span style="width:${remainRate}%"></span></div><div class="graph-card-caption"><span>예산 ${formatCompact(item.budget)}</span><span>원인행위 ${formatCompact(item.committed)} · 집행률 ${usedRate.toFixed(1)}%</span></div></div><div class="graph-card-action">${action}</div></div>${isExpanded ? renderNestedRows(item, rows) : ''}</article>`;
}

function childRowsFor(parent, rows, depth = 0) {
  if (state.level === 'detail') return [];
  const source = rows.filter(item => state.level === 'business' ? item.business === parent.business : item.business === parent.business && item.item === parent.item);
  if (state.level === 'business' && depth === 0) {
    const map = new Map();
    source.forEach(item => {
      const key = item.item || '세부항목 없음';
      if (!map.has(key)) map.set(key, { ...item, id: `nested-item-${parent.id}-${key}`, sourceId: item.id, count: 0, budget: 0, committed: 0, paid: 0, remaining: 0, available: 0, planned: 0 });
      const child = map.get(key);
      child.count += 1; child.budget += item.budget; child.committed += item.committed; child.paid += item.paid; child.remaining += item.remaining; child.available += currentBalance(item); child.planned += item.planned;
      child.manager = mergeManagers(child.manager, item.manager);
    });
    return sortRows([...map.values()].map(child => ({ ...child, available: currentBalance(child) })), 'item');
  }
  return sortRows(source, 'detail');
}

function renderNestedRows(parent, rows, depth = 0) {
  const children = childRowsFor(parent, rows, depth);
  if (!children.length) return '<div class="nested-empty">표시할 세부내역이 없습니다.</div>';
  const childLevel = state.level === 'business' && depth === 0 ? '세부항목' : '산출내역';
  const canExpand = state.level === 'business' && depth === 0;
  return `<div class="nested-list"><div class="nested-heading"><strong>${childLevel} ${children.length.toLocaleString('ko-KR')}개</strong><span>${canExpand ? '세부항목을 누르면 산출내역까지 확인할 수 있습니다.' : '산출내역별 금액과 담당자를 확인할 수 있습니다.'}</span></div>${children.map(child => { const key = `nested:${state.level}:${parent.id}:${child.id}`; const open = state.expandedKeys.has(key); const balance = child.available ?? currentBalance(child); const rate = percent(balance, child.budget); const title = canExpand ? child.item : child.detail; const sub = canExpand ? `${child.count}개 산출내역 · ${child.cost}` : `${child.business} · ${child.item} · ${child.cost}`; const attrs = canExpand ? `data-expand-key="${esc(key)}"` : `data-row-id="${esc(child.sourceId || child.id)}"`; return `<div class="nested-entry${open ? ' is-expanded' : ''}" ${attrs}><div class="nested-entry-main"><span class="nested-level">${childLevel}</span><strong>${esc(title || '이름 없음')}</strong><span>${esc(sub)} · 담당자 ${esc(managerLabel(child.manager))}</span></div><div class="nested-entry-balance"><strong>${formatWon(balance)}</strong><span>${rate.toFixed(1)}% 남음</span></div><div class="nested-entry-bar"><span class="tone-${rate >= 60 ? 'high' : rate >= 30 ? 'mid' : 'low'}" style="width:${rate}%"></span></div><span class="nested-entry-arrow">${canExpand ? (open ? '접기' : '산출내역 보기') : '상세 보기'} ${icons.chevron}</span>${open ? renderNestedRows(child, rows, depth + 1) : ''}</div>`; }).join('')}</div>`;
}

function renderExplorePlan(groups) {
  if (state.level !== 'detail') return `<div class="plan-level-guide"><div class="plan-guide-icon">${icons.info}</div><div><strong>계획은 산출내역 단위로 입력합니다.</strong><p>세부사업이나 세부항목에서 바로 아래 내역을 펼친 뒤, 산출내역 화면으로 이동하면 각 금액을 따로 기록할 수 있습니다.</p></div><button class="primary-btn" data-action="open-detail-level">산출내역에서 입력하기 ${icons.chevron}</button></div>`;
  if (!groups.length) return '<div class="empty-inline">검색 조건에 맞는 산출내역이 없습니다.</div>';
  const plans = getPlans();
  return `<div class="plan-view-intro"><div><strong>앞으로 사용할 금액을 산출내역별로 기록하세요.</strong><span>금액을 입력하면 계획 반영 후 잔액을 바로 계산합니다. 저장한 계획은 이 브라우저에만 보관됩니다.</span></div><span class="plan-count">${groups.length.toLocaleString('ko-KR')}개 산출내역</span></div><div class="explore-plan-list">${groups.map(item => { const plan = plans[item.id] || { amount: item.planned || '', date: '미정' }; const balance = item.available ?? currentBalance(item); const expected = Math.max(0, balance - numberValue(plan.amount)); return `<article class="plan-card"><div class="plan-card-title"><span>${esc(item.business)} · ${esc(item.item)} · ${esc(item.cost)}</span><h3>${esc(item.detail || '산출내역 없음')}</h3><small>담당자: ${esc(managerLabel(item.manager))}</small></div><div class="plan-card-numbers"><div><span>현재 잔액</span><strong>${formatWon(balance)}</strong></div><div><span>전체 예산</span><strong>${formatWon(item.budget)}</strong></div><div><span>사용 결정</span><strong>${formatWon(item.committed)}</strong></div></div><label class="inline-plan-field"><span>앞으로 사용할 예정</span><div><input inputmode="numeric" data-inline-plan="${esc(item.id)}" value="${esc(plan.amount)}" placeholder="0" /><b>원</b></div></label><div class="inline-plan-result"><span>계획 반영 후 잔액</span><strong data-plan-preview="${esc(item.id)}">${formatWon(expected)}</strong></div><button class="inline-plan-save" data-action="save-inline-plan" data-plan-row-id="${esc(item.id)}">계획 저장</button></article>`; }).join('')}</div>`;
}

function renderTableRow(item, rows) {
  const rate = percent(item.paid, item.budget);
  const sub = state.level === 'business' ? `${item.item} · ${item.count}개 항목` : `${item.business} · ${item.item}${item.count > 1 ? ` · ${item.count}개 산출내역` : ''}`;
  const selectId = item.sourceId || item.id || state.rows.find(row => row.business === item.business && (state.level === 'business' || row.item === item.item))?.id;
  const available = item.available ?? currentBalance(item);
  const key = `table:${state.level}:${item.id}`;
  const canExpand = state.level !== 'detail';
  const expanded = state.expandedKeys.has(key);
  const attrs = canExpand ? `data-expand-key="${esc(key)}"` : `data-row-id="${esc(selectId || item.id)}"`;
  return `<div class="table-row-wrap${expanded ? ' is-expanded' : ''}"><button type="button" class="table-row" ${attrs}><div class="table-main"><strong>${esc(state.level === 'detail' ? item.detail : state.level === 'item' ? item.item : item.business)}</strong><span>${esc(sub)} · ${esc(item.cost)} · 담당자 ${esc(managerLabel(item.manager))}</span></div><div class="table-cell">${formatCompact(item.budget)}</div><div class="table-cell muted">${formatCompact(item.paid)}</div><div class="table-cell blue">${formatCompact(available)}</div><div class="table-cell"><div class="table-rate"><span class="small-bar"><span style="display:block;width:${rate}%;height:100%;background:${rate > 85 ? '#df9a53' : '#35b286'}"></span></span><span>${rate.toFixed(0)}%</span></div><span class="row-action">${canExpand ? (expanded ? '접기' : '세부 보기') : '상세 보기'} ${icons.chevron}</span></div></button>${expanded ? renderNestedRows(item, rows) : ''}</div>`;
}

function renderPlanning(summary) {
  const plans = getPlans();
  const rows = [...state.rows]
    .map(item => ({ ...item, available: currentBalance(item), planAmount: numberValue(plans[item.id]?.amount || item.planned), planDate: plans[item.id]?.date || '미정' }))
    .filter(item => item.planAmount > 0)
    .sort((a, b) => b.planAmount - a.planAmount);
  const planned = rows.reduce((total, item) => total + item.planAmount, 0);
  return `<div class="planning-grid"><section class="panel"><div class="panel-header"><div><div class="section-kicker">집행 계획</div><h2 class="panel-title">앞으로 쓸 예산을 적어두세요</h2><p class="panel-description">사업을 선택하고 금액을 입력하면 예상 잔액에 바로 반영됩니다.</p></div><button class="outline-btn" data-view="explore">항목 찾기</button></div>${rows.length ? `<div class="plan-list">${rows.map(item => `<button class="plan-item" data-row-id="${esc(item.id)}" aria-label="${esc(item.detail)} 계획 상세 보기"><div class="plan-item-copy"><strong>${esc(item.business)} · ${esc(item.item)}</strong><span>${esc(item.detail)}</span><small>담당자: ${esc(managerLabel(item.manager))}</small></div><div class="plan-item-metric planned"><span>계획 금액</span><strong>${formatCompact(item.planAmount)}</strong></div><div class="plan-item-metric remaining"><span>계획 후 잔액</span><strong>${formatCompact(Math.max(0, item.available - item.planAmount))}</strong></div><span class="status-chip planned">${esc(item.planDate)}</span></button>`).join('')}</div>` : '<div class="empty-inline" style="padding:65px 24px">아직 입력한 집행계획이 없습니다.<br>사업 탐색에서 항목을 고르고 계획을 반영해 보세요.</div>'}</section><aside class="panel plan-summary"><div class="section-kicker">계획 합계</div><h3>입력한 집행계획</h3><div class="plan-total">${formatCompact(planned)}</div><p>${rows.length ? `${rows.length}개 항목에 입력했습니다. 계획은 현재 브라우저에만 저장됩니다.` : '예산을 실제로 쓰기 전, 예상 금액을 미리 기록할 수 있습니다.'}</p><div class="plan-list-label"><span>전체 잔액 대비</span><span>${percent(planned, summary.available).toFixed(1)}%</span></div><div class="mini-progress"><div style="width:${percent(planned, summary.available)}%;background:var(--violet)"></div></div><div class="progress-caption"><span>현재 잔액 ${formatCompact(summary.available)}</span><span>계획 후 ${formatCompact(Math.max(0, summary.available - planned))}</span></div><button class="primary-btn" style="margin-top:22px" data-view="explore">예산 항목 둘러보기</button></aside></div>`;
}

function renderSchoolwide() {
  if (!state.schoolwideRows.length) return `<section class="panel schoolwide-panel"><div class="panel-header"><div><div class="section-kicker">학교 전체 예산</div><h2 class="panel-title">학교 전체 자료 파일을 연결해 보세요</h2><p class="panel-description">정책사업 → 단위사업 → 세부사업 → 세부항목 순서로 학교 전체 집행현황을 확인합니다.</p></div><button class="primary-btn" style="flex:0 0 auto" data-action="upload-schoolwide">학교 전체 자료 불러오기</button></div><div class="empty-inline" style="padding-top:28px">학교 전체 분석 파일은 현재 기기에서만 읽습니다.<br>사업관리카드와 함께 올려도 원본 파일은 서버로 전송되지 않습니다.</div></section>`;
  const summary = aggregate(state.schoolwideRows);
  const groups = groupSchoolwide(state.schoolwideRows).slice(0, 12);
  return `<section class="panel schoolwide-panel"><div class="panel-header"><div><div class="section-kicker">학교 전체 자료</div><h2 class="panel-title">정책사업부터 잔액까지 내려가 보기</h2><p class="panel-description">원인행위액은 사용하기로 한 금액, 지급액은 실제 지급한 금액입니다.</p></div><button class="outline-btn" data-action="upload-schoolwide">자료 변경</button></div><div class="schoolwide-cards"><div class="schoolwide-card"><span>학교 전체 예산현액</span><strong>${formatCompact(summary.budget)}</strong><small>${state.schoolwideRows.length}개 항목</small></div><div class="schoolwide-card"><span>원인행위액</span><strong>${formatCompact(summary.committed)}</strong><small>${percent(summary.committed, summary.budget).toFixed(1)}% 사용 결정</small></div><div class="schoolwide-card"><span>학교 전체 잔액</span><strong>${formatCompact(summary.available)}</strong><small>지급액 ${formatCompact(summary.paid)}</small></div></div><div class="tree-list" style="margin-top:17px">${groups.map(item => `<button class="tree-item" data-row-id="${esc(item.id)}"><div><strong>${esc(item.name)}</strong><span>${esc(item.detail)} · ${item.count}개 항목</span></div><div class="tree-amount">${formatCompact(item.available)}</div><div class="tree-percent">${percent(item.paid, item.budget).toFixed(1)}% 집행 ${icons.chevron}</div></button>`).join('')}</div></section>`;
}

function groupSchoolwide(rows) {
  const map = new Map();
  rows.forEach(item => {
    const name = item.policy || item.business || '분류 없음';
    if (!map.has(name)) map.set(name, { id: item.id, name, detail: item.unit || item.business || item.item, count: 0, budget: 0, committed: 0, paid: 0, remaining: 0, available: 0 });
    const group = map.get(name);
    group.count += 1; group.budget += item.budget; group.committed += item.committed; group.paid += item.paid; group.remaining += item.remaining; group.available += currentBalance(item);
  });
  return [...map.values()].map(group => ({ ...group, available: currentBalance(group) })).sort((a,b) => b.available - a.available);
}

function renderModal() {
  if (!state.modal) return '';
  return `<div class="modal-backdrop" data-action="close-modal"><div class="modal" onclick="event.stopPropagation()"><div class="modal-head"><h2>예산현황판 사용 안내</h2><button class="close-btn" data-action="close-modal">${icons.close}</button></div><p class="modal-copy">에듀파인 원본 파일을 그대로 불러오고, 내 사업 잔액부터 학교 전체 예산 흐름까지 이어서 확인하세요.</p><div class="guide-list"><div class="guide-item"><div class="guide-num">1</div><div><strong>파일을 불러옵니다</strong><span>사업관리카드(예산·현액) 파일을 선택하면 시트와 열을 자동으로 판별합니다.</span></div></div><div class="guide-item"><div class="guide-num">2</div><div><strong>필요한 범위로 좁힙니다</strong><span>세부사업, 세부항목, 산출내역 단위로 검색하고 비목과 집행 상태를 조합할 수 있습니다.</span></div></div><div class="guide-item"><div class="guide-num">3</div><div><strong>집행계획을 반영합니다</strong><span>앞으로 사용할 금액과 메모를 입력하면 예상 잔액을 바로 계산합니다. 입력값은 이 브라우저에만 저장됩니다.</span></div></div><div class="guide-item"><div class="guide-num">4</div><div><strong>파일을 비우면</strong><span>자료 비우기는 화면에서 엑셀을 제거합니다. 계획과 메모까지 지우려면 확인 후 저장값도 함께 삭제할 수 있습니다.</span></div></div></div></div></div>`;
}

function render() {
  const activeRows = state.view === 'schoolwide' && state.schoolwideRows.length ? state.schoolwideRows : state.rows;
  const visibleRows = getFilteredRows(activeRows);
  const hasFilter = state.manager !== 'all' || state.search || state.cost !== 'all' || state.status !== 'all';
  const summary = aggregate(hasFilter ? visibleRows : activeRows);
  const content = !state.hasData ? renderEmpty() : `${renderCrumb()}${renderHero({ ...summary, count: visibleRows.length })}${renderStats(summary)}${renderNav(visibleRows.length)}${renderManagerFilter(activeRows)}${state.view === 'overview' ? renderOverview(summary) : state.view === 'explore' ? renderExplore() : state.view === 'planning' ? renderPlanning(summary) : renderSchoolwide()}`;
  app.innerHTML = `${renderHeader()}<main class="main${!state.hasData ? ' initial-main' : ''}">${content}</main>${state.toast ? `<div class="toast">${esc(state.toast)}</div>` : ''}${renderModal()}`;
  bindDropzone();
}

function renderEmpty() {
  return `<div class="empty-scene"><section class="empty-hero hero-card"><div class="empty-copy"><div class="eyebrow"><span class="spark"></span>학교 예산 분석</div><h1>내 사업 분석<br>지금 남은 예산부터<br><span>확인하세요.</span></h1><p>사업관리카드(예산 또는 현액) 하나만 불러오면 현재 잔액을 먼저 보여드리고, 앞으로 쓸 계획이 있을 때 예상 잔액까지 바로 계산해드려요.</p><div class="empty-steps"><span class="empty-step"><b>1</b>사업관리카드 업로드</span><span class="step-arrow">${icons.arrow}</span><span class="empty-step"><b>2</b>자동 분석</span><span class="step-arrow">${icons.arrow}</span><span class="empty-step"><b>3</b>잔액 확인</span></div><div class="source-guide"><div class="source-guide-title">${icons.info}<strong>어디서 받나요?</strong></div><div class="source-guide-path"><strong>에듀파인</strong><span>›</span><strong>학교회계</strong><span>›</span><strong>사업관리</strong><span>›</span><strong>사업관리카드</strong><span>›</span><strong>사업관리카드(예산) 또는 사업관리카드(현액)</strong></div><p>사업관리카드는 예산액·원인행위액·지급액·잔액을 함께 확인할 수 있는 원본 자료입니다.</p></div></div><div class="empty-upload"><div class="dropzone" data-dropzone><span class="upload-badge">가장 먼저</span><div class="drop-icon">${icons.upload}</div><strong>사업관리카드 불러오기</strong><span class="drop-hint">파일을 끌어놓거나 아래 버튼으로 선택하세요.</span><button class="upload-btn" data-action="upload-business">${icons.file} 파일 선택</button><span class="upload-formats">.xlsx · .xls · .csv · .ods · 자동 판별</span><span class="local-note">${icons.lock} 파일은 이 브라우저에서만 분석됩니다.</span></div></div></section><section class="schoolwide-callout"><div class="callout-icon">${icons.file}</div><div class="callout-copy"><span>지원 기능 · 사업관리카드</span><strong>다른 예산 자료도 이어서 볼까요?</strong><p>사업관리카드(예산) 또는 사업관리카드(현액)를 다시 선택하면 현재 자료를 새 파일로 바꿔서 분석합니다.</p></div><button class="outline-btn" data-action="upload-business">다른 파일 선택 ${icons.chevron}</button></section></div>`;
}

function showToast(message) {
  state.toast = message; render(); clearTimeout(toastTimer); toastTimer = setTimeout(() => { state.toast = ''; render(); }, 2800);
}

function chooseFile(mode) {
  state.uploadMode = mode; fileInput.value = ''; fileInput.click();
}

function bindDropzone() {
  const dropzone = document.querySelector('[data-dropzone]');
  if (!dropzone) return;
  ['dragenter', 'dragover'].forEach(type => dropzone.addEventListener(type, event => { event.preventDefault(); dropzone.classList.add('dragover'); }));
  ['dragleave', 'drop'].forEach(type => dropzone.addEventListener(type, event => { event.preventDefault(); dropzone.classList.remove('dragover'); }));
  dropzone.addEventListener('drop', event => { const files = [...event.dataTransfer.files]; if (files.length) handleFiles(files, state.uploadMode); });
}

async function handleFiles(files, mode = 'business') {
  const file = files[0];
  if (!file) return;
  const allowed = /\.(xlsx|xls|csv|ods)$/i.test(file.name);
  if (!allowed) { showToast('엑셀·CSV·ODS 파일만 불러올 수 있습니다.'); return; }
  state.busy = true; render();
  try {
    const source = /\.(csv|tsv)$/i.test(file.name) ? await file.text() : await file.arrayBuffer();
    const parsed = parseWorkbook(source, file.name, mode);
    if (!parsed.rows.length) throw new Error('숫자 예산 열이 있는 항목을 찾지 못했습니다.');
    state.manager = 'all';
    if (parsed.type === 'schoolwide' || mode === 'schoolwide') state.schoolwideRows = parsed.rows;
    if (parsed.type !== 'schoolwide' || mode !== 'schoolwide') {
      const firstAmountRow = parsed.rows.find(item => item.budget || item.committed || item.paid || item.remaining) || parsed.rows[0];
      state.rows = parsed.rows; state.sourceType = parsed.type; state.sourceName = file.name; state.sourceSheet = parsed.sheet; state.isDemo = false; state.hasData = true; state.selectedId = firstAmountRow.id; state.view = 'overview';
    } else {
      state.sourceName = file.name; state.sourceSheet = parsed.sheet; state.schoolwideRows = parsed.rows; state.hasData = true; state.isDemo = false; state.sourceType = 'schoolwide'; state.view = 'schoolwide';
    }
    const saved = saveDataset();
    state.busy = false; render(); showToast(saved ? `${parsed.rows.length.toLocaleString('ko-KR')}개 항목을 불러왔습니다. 다음 접속에도 이 브라우저에서 이어서 볼 수 있어요.` : `${parsed.rows.length.toLocaleString('ko-KR')}개 항목을 불러왔습니다. 브라우저 저장 공간이 부족해 이번 접속에서만 유지됩니다.`);
  } catch (error) {
    state.busy = false; render(); showToast(`파일을 읽지 못했습니다. ${error.message || '헤더와 숫자 열을 확인해 주세요.'}`);
  }
}

function parseWorkbook(buffer, fileName, requestedMode) {
  if (typeof XLSX === 'undefined') throw new Error('엑셀 파서가 준비되지 않았습니다. vendor 파일을 확인해 주세요.');
  const isTextSource = typeof buffer === 'string';
  const workbook = XLSX.read(buffer, { type: isTextSource ? 'string' : 'array', cellDates: true, raw: true });
  let best = null;
  workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: true });
    const candidate = findHeaderRow(matrix, fileName, requestedMode);
    if (candidate && (!best || candidate.score > best.score)) best = { ...candidate, sheetName, matrix };
  });
  if (!best) throw new Error('헤더 행을 찾지 못했습니다. 에듀파인 원본 파일인지 확인해 주세요.');
  const type = requestedMode === 'schoolwide' ? 'schoolwide' : requestedMode === 'revenue' ? 'revenue' : detectType(best.headers, fileName);
  const columns = mapColumns(best.headers, type);
  const records = [];
  let detailCount = 0;
  for (let index = best.headerRow + 1; index < best.matrix.length; index++) {
    const raw = best.matrix[index] || [];
    const record = mapRecord(raw, columns, type, fileName, best.sheetName, index + 1);
    if (!record) continue;
    if (!isSubtotalRow(record) || best.matrix.length - best.headerRow < 40) { records.push(record); if (!isSubtotalRow(record)) detailCount += 1; }
  }
  return { rows: records, type, sheet: best.sheetName, detailCount };
}

function findHeaderRow(matrix, fileName, requestedMode) {
  let best = null;
  matrix.slice(0, 80).forEach((row, index) => {
    const headers = row.map(value => String(value ?? '').trim());
    const joined = normalize(headers.join(' '));
    const terms = ['예산', '현액', '원인행위', '지급', '세부사업', '세부항목', '산출내역', '정책사업', '단위사업', '수입', '세입', '집행'];
    const score = terms.reduce((total, term) => total + (joined.includes(normalize(term)) ? 1 : 0), 0) + (headers.filter(Boolean).length > 4 ? 1 : 0) + (requestedMode === 'schoolwide' && (joined.includes('정책사업') || joined.includes('1022')) ? 4 : 0);
    if (score >= 2 && (!best || score > best.score)) best = { headerRow: index, headers, score };
  });
  return best;
}

function detectType(headers, fileName) {
  const text = normalize([...headers, fileName].join(' '));
  if (text.includes('1022') || text.includes('정책사업') || text.includes('학교전체')) return 'schoolwide';
  if (text.includes('세입') || text.includes('수입') || text.includes('징수')) return 'revenue';
  return 'business';
}

function findColumn(headers, aliases, exclude = []) {
  const normalizedHeaders = headers.map(normalize);
  const normalizedAliases = aliases.map(normalize);
  const normalizedExclude = exclude.map(normalize);
  let bestIndex = -1; let bestScore = -1;
  normalizedHeaders.forEach((header, index) => {
    if (!header || normalizedExclude.some(term => header.includes(term))) return;
  normalizedAliases.forEach((alias, aliasIndex) => {
      let score = -1;
      if (header === alias) score = 1000 - aliasIndex;
      else if (header.includes(alias)) score = 100 + alias.length - aliasIndex;
      if (score > bestScore) { bestScore = score; bestIndex = index; }
    });
  });
  return bestIndex;
}

function mapColumns(headers, type) {
  const budget = findColumn(headers, ['예산현액(A)', '예산현액', '예산액', '예산금액', '예산']);
  const committed = findColumn(headers, ['원인행위액(B)', '원인행위액', '원인행위', '사용결정액', '사용결정']);
  const paid = findColumn(headers, ['지급액(C)', '지급액', '지출액', '지출결의액', '지출결의']);
  const remaining = findColumn(headers, ['지출잔액(A-C)', '예산잔액', '지출잔액', '잔액']);
  return {
    policy: findColumn(headers, ['정책사업', '정책']),
    unit: findColumn(headers, ['단위사업', '단위']),
    business: findColumn(headers, ['세부사업', '사업명', '사업']),
    item: findColumn(headers, ['세부항목', '항목명', '세부목']),
    cost: findColumn(headers, ['원가통계비목', '비목', '목']),
    detail: findColumn(headers, ['산출내역', '산출근거', '내역', '내용']),
    budget, committed, paid, remaining,
    increase: findColumn(headers, ['증감액', '증감']),
    manager: findColumn(headers, ['담당자', '세부항목담당자']),
    revenue: findColumn(headers, ['수입항목', '세입항목', '재원', '수입내역'])
  };
}

function cell(raw, index) { return index >= 0 ? raw[index] : ''; }

function mapRecord(raw, columns, type, fileName, sheetName, rowNumber) {
  const textValues = raw.filter(value => value !== null && value !== undefined && String(value).trim() !== '').map(value => String(value));
  if (!textValues.length) return null;
  const business = String(cell(raw, columns.business) || cell(raw, columns.unit) || cell(raw, columns.policy) || (type === 'revenue' ? cell(raw, columns.revenue) : '') || '분류 없음').trim();
  const item = String(cell(raw, columns.item) || cell(raw, columns.unit) || cell(raw, columns.revenue) || '세부항목 없음').trim();
  const cost = String(cell(raw, columns.cost) || '비목 미분류').trim();
  const detail = String(cell(raw, columns.detail) || item).trim();
  const budget = numberValue(cell(raw, columns.budget));
  const committed = numberValue(cell(raw, columns.committed));
  const paid = numberValue(cell(raw, columns.paid));
  const explicitRemaining = numberValue(cell(raw, columns.remaining));
  const remaining = explicitRemaining || Math.max(0, budget - paid);
  if (!business && !item && !detail && !budget && !committed && !paid) return null;
  const idBase = [fileName, sheetName, rowNumber, business, item, detail].join('|');
  const plans = getPlans();
  return { id: idBase, sourceType: type, sourceName: fileName, sheet: sheetName, rowNumber, policy: String(cell(raw, columns.policy) || '').trim(), unit: String(cell(raw, columns.unit) || '').trim(), business, item, cost, detail, budget, committed, paid, remaining, planned: numberValue(plans[idBase]?.amount), manager: String(cell(raw, columns.manager) || '').trim() };
}

function isSubtotalRow(item) {
  const text = normalize([item.policy, item.unit, item.business, item.item, item.cost, item.detail].join(' '));
  return /소계|합계|총계|전체합계/.test(text) || text.includes('세부사업소계') || text.includes('세부항목소계');
}

function clearData() {
  const deletePlans = window.confirm('화면의 엑셀 자료를 비우고, 저장된 집행계획·메모도 함께 지울까요?');
  state.rows = []; state.schoolwideRows = []; state.hasData = false; state.isDemo = false; state.sourceName = ''; state.sourceSheet = ''; state.selectedId = ''; state.manager = 'all'; state.view = 'overview';
  localStorage.removeItem(DATA_KEY);
  if (deletePlans) localStorage.removeItem(PLAN_KEY);
  render(); showToast(deletePlans ? '엑셀과 입력값을 모두 비웠습니다.' : '엑셀 자료를 비웠습니다.');
}

app.addEventListener('click', event => {
  const actionTarget = event.target.closest('[data-action]');
  const viewTarget = event.target.closest('[data-view]');
  const levelTarget = event.target.closest('[data-level]');
  const modeTarget = event.target.closest('[data-explore-mode]');
  const expandTarget = event.target.closest('[data-expand-key]');
  const rowTarget = event.target.closest('[data-row-id]');
  if (modeTarget) { state.exploreMode = modeTarget.dataset.exploreMode; render(); return; }
  if (rowTarget && !actionTarget) { state.selectedId = rowTarget.dataset.rowId; if (state.view === 'planning' || state.view === 'explore') state.view = 'overview'; render(); return; }
  if (expandTarget) {
    const key = expandTarget.dataset.expandKey;
    if (state.expandedKeys.has(key)) state.expandedKeys.delete(key); else state.expandedKeys.add(key);
    render(); return;
  }
  if (actionTarget) {
    const action = actionTarget.dataset.action;
    if (action === 'upload-business') chooseFile('business');
    if (action === 'upload-schoolwide') chooseFile('schoolwide');
    if (action === 'load-demo') { state.rows = demoRows; state.schoolwideRows = []; state.hasData = true; state.isDemo = true; state.sourceName = '예시 데이터'; state.sourceSheet = '예시'; state.sourceType = 'business'; state.selectedId = demoRows[0].id; state.view = 'overview'; render(); }
    if (action === 'reset') clearData();
    if (action === 'help') { state.modal = true; render(); }
    if (action === 'close-modal') { state.modal = false; render(); }
    if (action === 'clear-selection') { state.selectedId = ''; render(); }
    if (action === 'save-plan') savePlan();
    if (action === 'enter-plan') { state.selectedId = actionTarget.dataset.rowId || ''; state.level = 'detail'; state.exploreMode = 'plan'; state.view = 'explore'; state.expandedKeys.clear(); render(); }
    if (action === 'open-detail-level') { state.level = 'detail'; state.exploreMode = 'plan'; state.expandedKeys.clear(); render(); }
    if (action === 'save-inline-plan') saveInlinePlan(actionTarget.dataset.planRowId);
    if (action === 'open-overview') { state.selectedId = actionTarget.dataset.rowId || ''; state.view = 'overview'; render(); }
  }
  if (viewTarget) { state.view = viewTarget.dataset.view; render(); }
  if (levelTarget) { state.level = levelTarget.dataset.level; state.expandedKeys.clear(); render(); }
});

app.addEventListener('change', event => {
  const filter = event.target.closest('[data-filter]');
  if (filter) {
    state[filter.dataset.filter] = filter.value;
    if (filter.dataset.filter === 'manager') {
      const nextRows = getFilteredRows(state.rows);
      state.selectedId = nextRows[0]?.id || '';
    }
    render();
  }
  if (event.target.matches('[data-plan-field]')) savePlan(false);
});

app.addEventListener('input', event => {
  const inlinePlan = event.target.closest('[data-inline-plan]');
  if (inlinePlan) {
    const item = state.rows.find(row => row.id === inlinePlan.dataset.inlinePlan);
    if (item) {
      const expected = Math.max(0, currentBalance(item) - numberValue(inlinePlan.value));
      [...document.querySelectorAll('[data-plan-preview]')].filter(element => element.dataset.planPreview === item.id).forEach(element => { element.textContent = formatWon(expected); });
    }
    return;
  }
  const detailAmount = event.target.closest('[data-plan-field="amount"]');
  if (detailAmount) {
    const item = findSelected();
    const preview = document.querySelector('[data-detail-plan-preview]');
    if (item && preview) preview.textContent = formatWon(Math.max(0, currentBalance(item) - numberValue(detailAmount.value)));
    return;
  }
  const search = event.target.closest('[data-filter="search"]');
  if (!search) return;
  state.search = search.value;
  const cursor = search.selectionStart;
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    render();
    const next = document.querySelector('[data-filter="search"]');
    if (next) { next.focus(); next.setSelectionRange(Math.min(cursor, next.value.length), Math.min(cursor, next.value.length)); }
  }, 120);
});

fileInput.addEventListener('change', event => handleFiles([...event.target.files], state.uploadMode));

function savePlan(showMessage = true) {
  const item = findSelected();
  if (!item) return;
  const amountInput = document.querySelector('[data-plan-field="amount"]');
  const dateInput = document.querySelector('[data-plan-field="date"]');
  const noteInput = document.querySelector('[data-plan-field="note"]');
  const amount = Math.max(0, numberValue(amountInput?.value));
  const plans = getPlans();
  if (!amount && !(noteInput?.value || '').trim()) delete plans[item.id];
  else plans[item.id] = { amount, date: dateInput?.value || '미정', note: noteInput?.value || '' };
  savePlans(plans);
  state.rows = state.rows.map(row => row.id === item.id ? { ...row, planned: amount } : row);
  if (showMessage) showToast('집행계획을 브라우저에 저장했습니다.'); else render();
}

function saveInlinePlan(id) {
  const item = state.rows.find(row => row.id === id);
  const input = [...document.querySelectorAll('[data-inline-plan]')].find(element => element.dataset.inlinePlan === id);
  if (!item || !input) return;
  const amount = Math.max(0, numberValue(input.value));
  const plans = getPlans();
  const previous = plans[id] || {};
  if (!amount && !(previous.note || '').trim()) delete plans[id];
  else plans[id] = { amount, date: previous.date || '미정', note: previous.note || '' };
  savePlans(plans);
  state.rows = state.rows.map(row => row.id === id ? { ...row, planned: amount } : row);
  showToast('집행계획을 브라우저에 저장했습니다.');
}

restoreDataset();
render();
