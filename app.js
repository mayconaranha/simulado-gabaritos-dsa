/* Simulado dos gabaritos: questões das avaliações do curso, para estudo. O histórico fica só no aparelho de cada pessoa.
   Prova real, conforme o regulamento: P1 (10 questões, 2 de cada área 1 a 5) e P2 (5 questões, área 6),
   25 min cada, sem correção durante a prova, 2 tentativas valendo a maior nota, calculadora liberada.
   P1 vale 1,0 por questão, P2 vale 2,0 por questão, PF = (P1 + P2) / 2 >= 7,0, MF = (2P + 3PF + 5TCC) / 10. */
const CHAVE = 'simulado_gabaritos_v2';
const $app = document.getElementById('app');
const LETRAS = 'ABCD';
const DURACAO = 25 * 60;
const AREAS = { 1: 'Não supervisionado', 2: 'Regressão OLS', 3: 'Máxima verossimilhança', 4: 'Árvores, ensembles e redes', 5: 'Técnicas diversas', 6: 'Gestão em Data Science (P2)', 0: 'Fora do escopo da prova' };

const VAZIO = () => ({ visto: {}, erros: {}, acertos: 0, total: 0, provas: [], stat: { area: {}, disc: {} }, media: '', tcc: '' });
function carregar() { try { return Object.assign(VAZIO(), JSON.parse(localStorage.getItem(CHAVE) || '{}')); } catch (e) { return VAZIO(); } }
function salvar() { try { localStorage.setItem(CHAVE, JSON.stringify(S)); } catch (e) {} }
let S = carregar();

const embaralhar = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const esc = t => String(t).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const paragrafos = t => esc(t).split('\n').filter(x => x.trim()).map(x => `<p>${x}</p>`).join('');
const fmt = n => n.toFixed(2).replace('.', ',');
const num = t => { const v = parseFloat(String(t).replace(',', '.')); return isNaN(v) ? 0 : v; };
const mmss = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
const contar = f => BANCO.filter(f).length;
// menos vistas primeiro; dentro do mesmo número de vezes, sorteio
const menosVistas = lista => embaralhar(lista).sort((a, b) => (S.visto[a.id] || 0) - (S.visto[b.id] || 0));
const imagens = q => q.img.map(f => `<p><img src="img/${f}" alt="figura da questão" style="max-width:100%;background:#fff;border-radius:8px"></p>`).join('');
const FONTE_NOTA = { confirma: 'Conferido com o material das aulas', geral: 'Explicação geral, sem slide correspondente', diverge: 'Atenção: não consegui conferir esta resposta com o material' };
function porque(q) {
  if (!q.e) return '';
  const aviso = q.s === 'diverge' ? `<p class="small sev-warn"><b>Atenção:</b> ${esc(q.n || 'não consegui conferir esta resposta com o material.')}</p>` : '';
  return `<div class="why"><h3>Por que essa é a resposta</h3><p>${esc(q.e)}</p>${aviso}<p class="small muted">${q.s === 'confirma' ? '✓ ' : ''}${esc(q.f || '')}${q.s === 'geral' ? ' · ' + FONTE_NOTA.geral : ''}</p></div>`;
}
const ordemDe = q => q.fixa ? q.ordem.map((_, k) => k) : embaralhar(q.ordem.map((_, k) => k));

function registrar(q, certo) {
  S.stat = S.stat || { area: {}, disc: {} };
  [[S.stat.area, String(q.a)], [S.stat.disc, q.d]].forEach(([tab, k]) => { const x = tab[k] = tab[k] || [0, 0]; x[0] += certo ? 1 : 0; x[1]++; });
}

const DISCIPLINAS = [...new Set(BANCO.map(q => q.d))].sort((a, b) => a.localeCompare(b, 'pt'));
let sessao = null;   // modo estudo
let prova = null;    // modo prova real
let relogio = null;

/* ---------- montagem das provas ---------- */
function montarP1() {
  return embaralhar([1, 2, 3, 4, 5].flatMap(a => menosVistas(BANCO.filter(q => q.a === a)).slice(0, 2)));
}
function montarP2() {
  const pool = BANCO.filter(q => q.a === 6 && q.q.length >= 120);
  return embaralhar(menosVistas(pool).slice(0, 5));
}

/* ---------- desempenho por tema ---------- */
// Ranking de cada tema com o desempenho de quem usa o simulado, da menor para a maior taxa de acerto.
// Só entram temas com pelo menos uma resposta; abaixo de 5 respostas na área (3 por avaliação) o número ainda é frágil.
function ranking(tipo) {
  const sim = (S.stat && S.stat[tipo]) || {};
  const chaves = tipo === 'area' ? ['1', '2', '3', '4', '5', '6'] : DISCIPLINAS.filter(d => BANCO.some(q => q.d === d && q.a > 0));
  const min = tipo === 'area' ? 5 : 3;
  return chaves.map(k => {
    const s = sim[k] || [0, 0];
    return { k, s, firme: s[1] >= min, pct: s[1] ? s[0] / s[1] : null };
  }).filter(x => x.pct !== null).sort((a, b) => a.pct - b.pct);
}
const sev = w => w >= 80 ? 'ok' : w >= 60 ? 'warn' : 'bad';
function linhaTema(x, nome, atributo) {
  const w = Math.round(100 * x.pct), v = sev(w);
  return `<div class="tema">
    <div class="tema-h"><span class="tema-n">${esc(nome)}</span><span class="tema-p sev-${v}">${w}%</span></div>
    <div class="meter" role="img" aria-label="${w}% de acertos"><i class="fill-${v}" style="width:${w}%"></i></div>
    <div class="tema-f"><span>${x.s[0]} de ${x.s[1]} certas${x.firme ? '' : ' (poucas respostas ainda)'}</span><button ${atributo}>Treinar</button></div>
  </div>`;
}

/* ---------- navegação por abas ---------- */
const ICONES = {
  inicio: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>',
  prova: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2"/><path d="M9 2h6"/></svg>',
  estudar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2z"/><path d="M4 19V5"/></svg>',
  desempenho: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20H2"/></svg>'
};
const ABAS = [['inicio', 'Início'], ['prova', 'Prova'], ['estudar', 'Estudar'], ['desempenho', 'Desempenho']];
let aba = 'inicio';
let verTodas = false;

const modo = m => { document.body.dataset.modo = m; };

function shell(conteudo) {
  modo('abas');
  $app.innerHTML = `
    <nav class="tabs" aria-label="Seções">${ABAS.map(([k, n]) => `<button data-aba="${k}" class="${k === aba ? 'on' : ''}" ${k === aba ? 'aria-current="page"' : ''}>${ICONES[k]}<span>${n}</span></button>`).join('')}</nav>
    ${conteudo}`;
  $app.querySelectorAll('[data-aba]').forEach(b => b.onclick = () => { aba = b.dataset.aba; home(); window.scrollTo(0, 0); });
}

function ligarAcoes() {
  const on = (sel, f) => $app.querySelectorAll(sel).forEach(b => b.onclick = () => f(b));
  on('[data-p]', b => iniciarProva(b.dataset.p, !document.getElementById('cron') || document.getElementById('cron').checked));
  on('[data-ta]', b => { const a = +b.dataset.ta; iniciar(embaralhar(menosVistas(BANCO.filter(q => q.a === a)).slice(0, 20)), AREAS[a]); });
  on('[data-td]', b => { const d = b.dataset.td; iniciar(embaralhar(BANCO.filter(q => q.d === d)), d); });
  on('[data-s]', b => { const base = BANCO.filter(q => q.a > 0); const n = b.dataset.s === 'todas' ? base.length : +b.dataset.s; iniciar(embaralhar(menosVistas(base).slice(0, n)), n === base.length ? 'Todas as questões' : `Sessão de ${n}`); });
  on('[data-m="erros"]', () => iniciar(embaralhar(BANCO.filter(q => S.erros[q.id])), 'Questões que você errou'));
  on('[data-fracos]', () => {
    const piores = ranking('area').slice(0, 3).map(r => +r.k);
    const pool = piores.length ? BANCO.filter(q => piores.includes(q.a)) : BANCO.filter(q => q.a > 0);
    const erros = pool.filter(q => S.erros[q.id]), resto = menosVistas(pool.filter(q => !S.erros[q.id]));
    iniciar(embaralhar(erros.concat(resto).slice(0, 20)), 'Treino nos pontos fracos');
  });
  const d = document.getElementById('go-disc'); if (d) d.onclick = () => { const v = document.getElementById('disc').value; iniciar(embaralhar(BANCO.filter(q => q.d === v)), v); };
  const h = document.getElementById('hist'); if (h) h.onclick = historico;
  const z = document.getElementById('zerar'); if (z) z.onclick = () => { if (confirm('Apagar todo o histórico deste simulado, inclusive as provas?')) { S = VAZIO(); salvar(); home(); } };
  const m = document.getElementById('mais'); if (m) m.onclick = () => { verTodas = !verTodas; home(); };
}

function home() {
  clearInterval(relogio); sessao = null; prova = null;
  const html = { inicio: telaInicio, prova: telaProvaMenu, estudar: telaEstudar, desempenho: telaDesempenho }[aba]();
  shell(html); ligarAcoes();
}

function telaInicio() {
  const vistas = Object.keys(S.visto).length, pct = S.total ? Math.round(100 * S.acertos / S.total) : null;
  const errosAtuais = contar(q => S.erros[q.id]);
  const ruim = ranking('area')[0];
  const w = ruim ? Math.round(100 * ruim.pct) : 0;
  const dias = Math.max(0, Math.ceil((new Date(2026, 10, 17, 20, 0) - new Date()) / 86400000));
  return `
    <section class="hero">
      <div class="dias">${dias}</div>
      <h2>${dias === 1 ? 'dia' : 'dias'} para a prova final</h2>
      <p>17/11, às 20h. P1 com 10 questões e P2 com 5, 25 minutos cada.</p>
      <button class="pri" data-p="COMP">Fazer a prova real</button>
    </section>
    <div class="grid g3">
      <div class="tile"><b>${vistas}</b><span>questões vistas de ${BANCO.length}</span></div>
      <div class="tile"><b>${pct === null ? '—' : pct + '%'}</b><span>de acertos no estudo</span></div>
      <div class="tile"><b>${S.provas.length}</b><span>prova${S.provas.length === 1 ? '' : 's'} feita${S.provas.length === 1 ? '' : 's'}</span></div>
    </div>
    ${ruim ? `<div class="alerta ${w >= 85 ? 'bom' : ''}"><div style="flex:1"><b>${w >= 85 ? 'Tudo em bom nível' : 'Ponto mais fraco agora'}</b><span>${esc(ruim.k + '. ' + AREAS[ruim.k])}, ${w}% de acertos</span></div><button data-ta="${ruim.k}">Treinar</button></div>` : ''}
    <div class="grid" style="margin-top:14px">
      <button class="cta" data-s="10"><strong>Estudar 10 questões</strong><span>Com a correção na hora</span></button>
      <button class="cta" data-fracos="1"><strong>Treino nos pontos fracos</strong><span>20 questões das 3 áreas em que você mais errou</span></button>
      ${errosAtuais ? `<button class="cta" data-m="erros"><strong>Revisar seus erros</strong><span>${errosAtuais} ${errosAtuais > 1 ? 'questões' : 'questão'} para refazer</span></button>` : ''}
    </div>`;
}

function telaProvaMenu() {
  const n = S.provas.length, m = melhores();
  return `
    <div class="card">
      <h2>Prova real</h2>
      <p class="muted">Funciona como a prova final: sem correção durante, pode voltar e trocar respostas, calculadora liberada. A correção completa vem ao finalizar.</p>
      <div class="grid" style="margin-top:12px">
        <button class="cta pri" data-p="COMP"><strong>Completa (P1 + P2)</strong><span>15 questões, com a nota final no fim</span></button>
        <div class="grid g2">
          <button class="cta" data-p="P1"><strong>Só a P1</strong><span>10 questões, 2 por área</span></button>
          <button class="cta" data-p="P2"><strong>Só a P2</strong><span>5 questões de gestão</span></button>
        </div>
      </div>
      <p style="margin-top:14px"><label class="row"><input type="checkbox" id="cron" checked style="width:22px;height:22px"> Cronômetro de 25 minutos por prova</label></p>
    </div>
    <div class="card">
      <h2>Como conta a nota</h2>
      <p>P1 vale 1,0 por questão e P2 vale 2,0. PF = (P1 + P2) / 2, e é preciso 7,0 ou mais. Vale a maior nota entre as duas tentativas.</p>
      ${n ? `<p class="muted">Melhores até agora: P1 ${m.p1 === null ? '—' : fmt(m.p1)} · P2 ${m.p2 === null ? '—' : fmt(m.p2)}.</p><button id="hist">Ver histórico e média final</button>` : '<p class="muted">Você ainda não fez nenhuma prova por aqui.</p>'}
    </div>`;
}

function telaEstudar() {
  const errosAtuais = contar(q => S.erros[q.id]);
  return `
    <div class="card">
      <h2>Sessão rápida</h2>
      <p class="muted">A correção aparece assim que você responde. As menos vistas vêm primeiro.</p>
      <div class="grid g3" style="margin-top:10px">
        <button class="pri" data-s="10">10</button><button class="pri" data-s="20">20</button><button data-s="todas">Todas</button>
      </div>
    </div>
    <div class="card">
      <h2>Reforço</h2>
      <div class="grid g2 q">
        <button data-m="erros" ${errosAtuais ? '' : 'disabled'}>Refazer as erradas (${errosAtuais})</button>
      </div>
    </div>
    <div class="card">
      <h2>Por área da prova</h2>
      <div class="chips">${[1, 2, 3, 4, 5, 6].map(a => `<button class="chip" data-ta="${a}">${a}. ${esc(AREAS[a].replace(' (P2)', ''))} · ${contar(q => q.a === a)}</button>`).join('')}</div>
    </div>
    <div class="card">
      <h2>Por avaliação</h2>
      <select id="disc" aria-label="Avaliação">${DISCIPLINAS.map(d => `<option value="${esc(d)}">${esc(d)} (${contar(q => q.d === d)})</option>`).join('')}</select>
      <p><button class="pri" id="go-disc" style="width:100%">Começar</button></p>
    </div>`;
}

function telaDesempenho() {
  const areas = ranking('area'), todas = ranking('disc'), discs = verTodas ? todas : todas.slice(0, 8);
  const vistas = Object.keys(S.visto).length;
  return `
    <div class="card">
      <h2>Onde você tem mais dificuldade</h2>
      <p class="muted small">Da área mais fraca para a mais forte, com base nas questões que você já respondeu aqui. Com menos de 5 respostas numa área, o número ainda oscila bastante.</p>
      ${areas.length ? areas.map(x => linhaTema(x, `${x.k}. ${AREAS[x.k]}`, `data-ta="${x.k}"`)).join('') : '<p>Ainda não há respostas. Faça uma sessão de estudo ou uma prova e o ranking das áreas aparece aqui.</p>'}
      <button class="pri" data-fracos="1" style="width:100%;margin-top:12px">Treino nos 3 pontos mais fracos</button>
    </div>
    <div class="card">
      <h2>Avaliações mais fracas</h2>
      ${discs.length ? discs.map(x => linhaTema(x, x.k, `data-td="${esc(x.k)}"`)).join('') : '<p class="muted">Aparecem aqui depois das primeiras respostas.</p>'}
      <button id="mais" style="width:100%;margin-top:10px">${verTodas ? 'Mostrar só as 8 mais fracas' : `Ver todas (${todas.length})`}</button>
    </div>
    <div class="card">
      <h2>Seu progresso</h2>
      <p>Você viu ${vistas} de ${BANCO.length} questões${S.total ? ` e acertou ${Math.round(100 * S.acertos / S.total)}% das ${S.total} respostas no estudo` : ''}.</p>
      <div class="bar"><i style="width:${Math.round(100 * vistas / BANCO.length)}%"></i></div>
      <div class="row" style="margin-top:14px">
        ${S.provas.length ? '<button id="hist">Provas feitas e média final</button>' : ''}
        <button id="zerar">Zerar histórico</button>
      </div>
    </div>`;
}

/* ======================= PROVA REAL ======================= */
function iniciarProva(tipo, comCron) {
  modo('foco');
  const partes = tipo === 'COMP' ? ['P1', 'P2'] : [tipo];
  prova = { tipo, comCron, partes: partes.map(n => ({ n, itens: (n === 'P1' ? montarP1() : montarP2()).map(q => ({ q, ordem: ordemDe(q), r: null })) })), pi: 0, i: 0, notas: {} };
  abrirParte();
}

function abrirParte() {
  const p = prova.partes[prova.pi];
  prova.i = 0; prova.fim = Date.now() + DURACAO * 1000; prova.encerrada = false;
  clearInterval(relogio);
  if (prova.comCron) relogio = setInterval(tique, 500);
  telaProva();
}

function tique() {
  const resta = Math.max(0, Math.ceil((prova.fim - Date.now()) / 1000));
  const el = document.getElementById('cron-v');
  if (el) { el.textContent = mmss(resta); el.classList.toggle('low', resta <= 300); }
  if (resta <= 0 && !prova.encerrada) { alert('Tempo esgotado. A prova foi encerrada.'); finalizarParte(true); }
}

function telaProva() {
  const p = prova.partes[prova.pi], it = p.itens[prova.i], q = it.q;
  const resp = p.itens.filter(x => x.r !== null).length;
  $app.innerHTML = `
    <div class="sticky">
      <div class="row"><b>${p.n === 'P1' ? 'P1 · Conhecimentos' : 'P2 · Interpretação'}</b>
        ${prova.comCron ? '<span class="cron" id="cron-v"></span>' : '<span class="muted">sem cronômetro</span>'}</div>
      <div class="bar" style="margin-top:8px"><i style="width:${Math.round(100 * resp / p.itens.length)}%"></i></div>
      <div class="nav" aria-label="Questões">${p.itens.map((x, k) => `<button data-n="${k}" class="${x.r !== null ? 'done' : ''} ${k === prova.i ? 'cur' : ''}" aria-label="Questão ${k + 1}${x.r !== null ? ', respondida' : ''}">${k + 1}</button>`).join('')}</div>
    </div>
    <div class="card">
      <p class="muted small">Questão ${prova.i + 1} de ${p.itens.length} · ${p.n === 'P1' ? '1,0 ponto' : '2,0 pontos'} · ${resp} respondida${resp === 1 ? '' : 's'}</p>
      <div class="enun">${paragrafos(q.q)}</div>${imagens(q)}
      <div id="ops">${it.ordem.map((k, pos) => `<button class="opt ${it.r === k ? 'sel' : ''}" data-k="${k}"><b>${LETRAS[pos]}</b><span>${esc(q.ordem[k])}</span></button>`).join('')}</div>
      <div id="calc"></div>
    </div>
    <div class="dock"><div class="in">
      <span><button id="ant" ${prova.i === 0 ? 'disabled' : ''} aria-label="Questão anterior">←</button><button id="prx" ${prova.i === p.itens.length - 1 ? 'disabled' : ''} aria-label="Próxima questão">→</button></span>
      <span><button id="calc-b">Calculadora</button><button class="pri" id="fin">Finalizar</button></span>
    </div></div>`;
  tique();
  $app.querySelectorAll('.nav button').forEach(b => b.onclick = () => { prova.i = +b.dataset.n; telaProva(); });
  $app.querySelectorAll('.opt').forEach(b => b.onclick = () => { it.r = it.r === +b.dataset.k ? null : +b.dataset.k; telaProva(); });
  document.getElementById('ant').onclick = () => { prova.i--; telaProva(); };
  document.getElementById('prx').onclick = () => { prova.i++; telaProva(); };
  document.getElementById('calc-b').onclick = calculadora;
  document.getElementById('fin').onclick = () => {
    const falta = p.itens.length - resp;
    if (confirm(falta ? `Faltam ${falta} questão(ões) sem resposta. Finalizar mesmo assim?` : 'Finalizar esta prova?')) finalizarParte(false);
  };
}

function calculadora() {
  const c = document.getElementById('calc');
  if (c.innerHTML) { c.innerHTML = ''; return; }
  c.innerHTML = `<div class="exp"><div class="row"><input type="text" id="expr" style="width:100%;max-width:340px" placeholder="ex.: (2,5+3)*4/7, sqrt(16), ln(2), exp(1), 2^3"><button id="igual">=</button></div><p class="muted" id="res" style="margin:6px 0 0"></p></div>`;
  const ex = document.getElementById('expr'), r = document.getElementById('res');
  const calc = () => {
    const FUN = { ln: 'Math.log', log: 'Math.log10', sqrt: 'Math.sqrt', exp: 'Math.exp', abs: 'Math.abs', pi: 'Math.PI' };
    let ruim = false;
    const t = ex.value.toLowerCase().replace(/,/g, '.').replace(/\^/g, '**').replace(/[a-z]+/g, w => { if (FUN[w]) return FUN[w]; ruim = true; return ''; });
    if (ruim || !/^[0-9+\-*/().\s]*$/.test(t.replace(/Math\.[A-Za-z0-9]+/g, ''))) { r.textContent = 'Expressão inválida'; return; }
    try { const v = Function('"use strict";return (' + t + ')')(); r.textContent = isFinite(v) ? String(+v.toPrecision(10)).replace('.', ',') : 'Resultado inválido'; } catch (e) { r.textContent = 'Expressão inválida'; }
  };
  document.getElementById('igual').onclick = calc;
  ex.onkeydown = e => { if (e.key === 'Enter') { e.stopPropagation(); calc(); } };
  ex.focus();
}

function finalizarParte(porTempo) {
  const p = prova.partes[prova.pi];
  prova.encerrada = true; clearInterval(relogio);
  p.itens.forEach(it => {
    S.visto[it.q.id] = (S.visto[it.q.id] || 0) + 1;
    registrar(it.q, it.r === it.q.c);   // em branco conta como erro, como na prova real
    if (it.r === null) return;
    if (it.r === it.q.c) delete S.erros[it.q.id]; else S.erros[it.q.id] = 1;
  });
  const ac = p.itens.filter(it => it.r === it.q.c).length;
  prova.notas[p.n] = p.n === 'P1' ? ac : ac * 2;
  p.sobra = Math.max(0, Math.ceil((prova.fim - Date.now()) / 1000));
  salvar();
  resultadoParte(porTempo);
}

function resultadoParte(porTempo) {
  modo('foco');
  const p = prova.partes[prova.pi], nota = prova.notas[p.n];
  const ultima = prova.pi === prova.partes.length - 1;
  const porArea = {};
  p.itens.forEach(it => { const a = it.q.a; porArea[a] = porArea[a] || [0, 0]; porArea[a][1]++; if (it.r === it.q.c) porArea[a][0]++; });
  const certas = p.itens.filter(it => it.r === it.q.c).length;
  $app.innerHTML = `
    <header class="top"><div class="brand"><h1>${p.n === 'P1' ? 'P1 · Prova de Conhecimentos' : 'P2 · Prova de Interpretação'}</h1><small>Resultado e correção</small></div></header>
    <div class="card">
      <div class="big ${nota >= 7 ? 'pass' : 'fail'}">${fmt(nota)}</div>
      <p class="muted">${certas} de ${p.itens.length} certas${porTempo ? ' · encerrada por tempo' : ''}${prova.comCron && !porTempo ? ` · sobraram ${mmss(p.sobra)}` : ''}</p>
      ${Object.keys(porArea).map(a => { const w = Math.round(100 * porArea[a][0] / porArea[a][1]), v = sev(w); return `<div class="tema"><div class="tema-h"><span class="tema-n">${esc(AREAS[a])}</span><span class="tema-p sev-${v}">${porArea[a][0]} / ${porArea[a][1]}</span></div><div class="meter"><i class="fill-${v}" style="width:${w}%"></i></div></div>`; }).join('')}
      <div class="row" style="margin-top:14px">
        ${ultima ? '<button class="pri" id="ir-final">Ver nota final</button>' : '<button class="pri" id="ir-p2">Seguir para a P2</button>'}
      </div>
    </div>
    <h2>Correção</h2>${p.itens.map((it, k) => revisao(it, k)).join('')}`;
  window.scrollTo(0, 0);
  const a = document.getElementById('ir-final'); if (a) a.onclick = finalProva;
  const b = document.getElementById('ir-p2'); if (b) b.onclick = () => { prova.pi++; abrirParte(); };
}

function revisao(it, k) {
  const q = it.q, ok = it.r === q.c;
  return `<div class="card"><div class="q-head"><span class="tag">${esc(q.d)}</span><b class="${ok ? 'pass' : 'fail'}">${it.r === null ? 'Sem resposta' : ok ? 'Acertou' : 'Errou'}</b></div>
    <div class="enun">${k + 1}. ${paragrafos(q.q)}</div>${imagens(q)}
    ${it.ordem.map((kk, pos) => `<div class="opt ${kk === q.c ? 'ok' : kk === it.r ? 'bad' : ''}" style="cursor:default"><b>${LETRAS[pos]}</b><span>${esc(q.ordem[kk])}</span></div>`).join('')}${porque(q)}</div>`;
}

function finalProva() {
  const n1 = prova.notas.P1, n2 = prova.notas.P2;
  const reg = { quando: Date.now(), tipo: prova.tipo, p1: n1 === undefined ? null : n1, p2: n2 === undefined ? null : n2 };
  S.provas.push(reg); salvar();
  mostrarFinal(reg, true);
}

function melhores() {
  const m = { p1: null, p2: null };
  S.provas.forEach(r => { ['p1', 'p2'].forEach(k => { if (r[k] !== null && (m[k] === null || r[k] > m[k])) m[k] = r[k]; }); });
  return m;
}

function mostrarFinal(reg, nova) {
  modo('foco');
  const m = melhores();
  const p1 = m.p1 ?? 0, p2 = m.p2 ?? 0, pf = (p1 + p2) / 2;
  const tent = S.provas.length;
  $app.innerHTML = `
    <header class="top"><div class="brand"><h1>${nova ? 'Resultado' : 'Histórico e média final'}</h1><small>Vale a maior nota entre as tentativas</small></div></header>
    <div class="card">
      ${reg ? `<p>Nesta prova: P1 <b>${reg.p1 === null ? '—' : fmt(reg.p1)}</b> · P2 <b>${reg.p2 === null ? '—' : fmt(reg.p2)}</b>${reg.p1 !== null && reg.p2 !== null ? ` · PF <b class="${(reg.p1 + reg.p2) / 2 >= 7 ? 'pass' : 'fail'}">${fmt((reg.p1 + reg.p2) / 2)}</b>` : ''}</p>` : ''}
      <p class="muted">Vale a maior nota entre as tentativas (a prova real permite 2). Melhores até agora, em ${tent} prova${tent > 1 ? 's' : ''}:</p>
      <p>P1: <b>${m.p1 === null ? '—' : fmt(m.p1)}</b> · P2: <b>${m.p2 === null ? '—' : fmt(m.p2)}</b></p>
      <p><b>PF = (P1 + P2) / 2 = ${fmt(pf)}</b> — ${pf >= 7 ? '<span class="pass">atinge o mínimo de 7,0</span>' : '<span class="fail">abaixo de 7,0 (iria para a recuperação)</span>'}</p>
    </div>
    <div class="card">
      <h2>Média final</h2>
      <p class="muted">MF = (2·P + 3·PF + 5·TCC) / 10. Ajuste os valores à vontade.</p>
      <div class="row">P (média parcial): <input type="text" id="mp" inputmode="decimal" placeholder="ex.: 8,5" value="${esc(S.media)}"> TCC: <input type="text" id="mt" inputmode="decimal" placeholder="ex.: 8,0" value="${esc(S.tcc)}"></div>
      <div id="mf" style="margin-top:10px"></div>
    </div>
    <div class="card"><h2>Provas feitas</h2><table class="lista"><tr><th>Quando</th><th>Tipo</th><th>P1</th><th>P2</th></tr>
      ${S.provas.slice().reverse().map(r => `<tr><td>${new Date(r.quando).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</td><td>${r.tipo}</td><td>${r.p1 === null ? '—' : fmt(r.p1)}</td><td>${r.p2 === null ? '—' : fmt(r.p2)}</td></tr>`).join('')}</table></div>
    <div class="row"><button class="pri" id="outra">Fazer outra prova</button><button id="inicio">Início</button></div>`;
  window.scrollTo(0, 0);
  const calc = () => {
    S.media = document.getElementById('mp').value; S.tcc = document.getElementById('mt').value; salvar();
    if (!S.media.trim() || !S.tcc.trim()) { document.getElementById('mf').innerHTML = '<p class="muted">Preencha a média parcial e a nota do TCC para ver a média final.</p>'; return; }
    const P = num(S.media), T = num(S.tcc), mf = (2 * P + 3 * pf + 5 * T) / 10;
    document.getElementById('mf').innerHTML = `<p><b>MF = ${fmt(mf)}</b></p><p>` +
      [['P ≥ 7,0', P >= 7], ['PF ≥ 7,0', pf >= 7], ['TCC ≥ 7,0', T >= 7]].map(c => `<span class="${c[1] ? 'pass' : 'fail'}">${c[1] ? '✔' : '✘'} ${c[0]}</span>`).join(' &nbsp; ') + '</p>';
  };
  document.getElementById('mp').oninput = calc; document.getElementById('mt').oninput = calc; calc();
  document.getElementById('outra').onclick = () => { aba = 'prova'; home(); }; document.getElementById('inicio').onclick = () => { aba = 'inicio'; home(); };
}
function historico() { mostrarFinal(null, false); }

/* ======================= ESTUDO (correção na hora) ======================= */
function iniciar(lista, titulo) {
  if (!lista.length) return;
  modo('foco');
  sessao = { lista, i: 0, titulo, ac: 0, resp: null, ordem: null };
  mostrar();
}

function mostrar() {
  const s = sessao, q = s.lista[s.i];
  s.ordem = ordemDe(q); s.resp = null;
  $app.innerHTML = `
    <div class="sticky">
      <div class="row"><span class="muted small">${esc(s.titulo)}</span><b>${s.i + 1} / ${s.lista.length}</b></div>
      <div class="bar" style="margin-top:8px"><i style="width:${Math.round(100 * s.i / s.lista.length)}%"></i></div>
    </div>
    <div class="card">
      <p><span class="tag">${esc(q.d)}</span></p>
      <div class="enun">${paragrafos(q.q)}</div>${imagens(q)}
      <div id="ops">${s.ordem.map((k, p) => `<button class="opt" data-k="${k}"><b>${LETRAS[p]}</b><span>${esc(q.ordem[k])}</span></button>`).join('')}</div>
      <div id="fb"></div>
    </div>
    <div class="dock"><div class="in"><button id="sair">Sair</button><button id="prox" class="pri" disabled style="flex:1;max-width:320px">${s.i + 1 === s.lista.length ? 'Ver resultado' : 'Próxima →'}</button></div></div>`;
  window.scrollTo(0, 0);
  $app.querySelectorAll('.opt').forEach(b => b.onclick = () => responder(+b.dataset.k));
  document.getElementById('prox').onclick = proxima;
  document.getElementById('sair').onclick = () => { if (confirm('Sair desta sessão?')) home(); };
}

function responder(k) {
  const s = sessao, q = s.lista[s.i];
  if (s.resp !== null) return;
  s.resp = k;
  const certo = k === q.c;
  S.visto[q.id] = (S.visto[q.id] || 0) + 1; S.total++;
  registrar(q, certo);
  if (certo) { S.acertos++; s.ac++; delete S.erros[q.id]; } else { S.erros[q.id] = 1; }
  salvar();
  $app.querySelectorAll('.opt').forEach(b => {
    const kk = +b.dataset.k; b.disabled = true;
    if (kk === q.c) b.classList.add('ok'); else if (kk === k) b.classList.add('bad');
  });
  document.getElementById('fb').innerHTML = certo
    ? '<div class="exp okx">Correto.</div>'
    : `<div class="exp badx">Errado. A resposta certa é a alternativa ${LETRAS[s.ordem.indexOf(q.c)]}.</div>`;
  document.getElementById('fb').innerHTML += porque(q);
  const p = document.getElementById('prox'); p.disabled = false; p.focus();
}

function proxima() {
  const s = sessao;
  if (s.resp === null) return;
  if (++s.i >= s.lista.length) return fim();
  mostrar();
}

function fim() {
  modo('foco');
  const s = sessao, n = s.lista.length, pct = Math.round(100 * s.ac / n);
  $app.innerHTML = `
    <header class="top"><div class="brand"><h1>${esc(s.titulo)}</h1><small>Fim da sessão</small></div></header>
    <div class="card"><div class="big ${pct >= 70 ? 'pass' : 'fail'}">${s.ac}/${n}</div><p class="muted">${pct}% de acertos</p>
      <div class="row"><button class="pri" id="de-novo">Voltar ao início</button><button id="ver-desemp">Ver o desempenho</button></div></div>`;
  document.getElementById('ver-desemp').onclick = () => { aba = 'desempenho'; home(); };
  document.getElementById('de-novo').onclick = home;
}

document.addEventListener('keydown', e => {
  if (e.target && e.target.tagName === 'INPUT') return;
  const k = 'abcd'.indexOf(e.key.toLowerCase());
  if (prova && !prova.encerrada) {
    if (k >= 0 && e.key.length === 1) { const b = $app.querySelectorAll('.opt')[k]; if (b) b.click(); }
    return;
  }
  if (!sessao) return;
  if (k >= 0 && e.key.length === 1 && sessao.resp === null) { const b = $app.querySelectorAll('.opt')[k]; if (b) b.click(); }
  else if (e.key === 'Enter' && sessao.resp !== null) proxima();
});

/* ---------- modo escuro (botão da faixa de topo; sem escolha, segue o sistema) ---------- */
const CHAVE_TEMA = 'simulado_gabaritos_tema';
const SOL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
const LUA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/></svg>';
function temaAtual() {
  return document.documentElement.dataset.tema || (matchMedia('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro');
}
function atualizarBotaoTema() {
  const escuro = temaAtual() === 'escuro', b = document.getElementById('luz');
  b.innerHTML = (escuro ? SOL : LUA) + '<span>' + (escuro ? 'Modo claro' : 'Modo escuro') + '</span>';
  b.setAttribute('aria-label', escuro ? 'Voltar ao modo claro' : 'Ativar o modo escuro');
}
try { const t = localStorage.getItem(CHAVE_TEMA); if (t === 'claro' || t === 'escuro') document.documentElement.dataset.tema = t; } catch (e) {}
document.getElementById('luz').onclick = () => {
  const novo = temaAtual() === 'escuro' ? 'claro' : 'escuro';
  document.documentElement.dataset.tema = novo;
  try { localStorage.setItem(CHAVE_TEMA, novo); } catch (e) {}
  atualizarBotaoTema();
};
atualizarBotaoTema();

home();
