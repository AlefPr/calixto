const inputBusca = document.getElementById('busca-cidade');
const divResultados = document.getElementById('resultados');
const botoesFiltro = document.querySelectorAll('.filter-btn');
const divSugestoes = document.getElementById('sugestoes');
const divEstado = document.getElementById('estado-busca');
const divContador = document.getElementById('contador-resultados');
const btnLimpar = document.getElementById('clear-btn');

let bancosDeDadosCidades = {};
let filtroAtivo = 'todos';
let dadosCarregados = false;

// 0. Estados de Loading / Vazio
function mostrarEstado(html) {
  divEstado.innerHTML = html;
  divEstado.classList.add('visible');
}

function esconderEstado() {
  divEstado.classList.remove('visible');
  divEstado.innerHTML = '';
}

// 1. Carregamento de Dados
mostrarEstado('<span class="spinner"></span><span class="estado-texto">Carregando dados das cidades...</span>');

fetch('./cidades.json')
  .then(response => response.json())
  .then(data => {
    let cidadeAtual = "";
    let popAtual = "";

    data.PLANOS.forEach(item => {
      if (!item) return;

      const colunaCidade = item[""] || item.Column1;
      if (colunaCidade === "CIDADE") return;

      if (colunaCidade && typeof colunaCidade === 'string' && colunaCidade.trim() !== "") {
        cidadeAtual = colunaCidade.trim().toUpperCase();
        popAtual = item.Column2 ? item.Column2.trim() : cidadeAtual;
        
        if (!bancosDeDadosCidades[cidadeAtual]) {
          bancosDeDadosCidades[cidadeAtual] = { cidade: cidadeAtual, pop: popAtual, planos: [], taxas: [], promocao: '' };
        }
      }

      if (cidadeAtual) {
        if (item.Column4 && item.Column4.trim() !== "") bancosDeDadosCidades[cidadeAtual].planos.push(item.Column4.trim());
        if (item.Column5 && item.Column5.trim() !== "") bancosDeDadosCidades[cidadeAtual].planos.push(item.Column5.trim());
        
        if (item.Column7 && item.Column7.trim() !== "") {
          const nomeTaxa = item.Column7.trim();
          if (/promocional/i.test(nomeTaxa) || /valor promocional/i.test(nomeTaxa)) {
            bancosDeDadosCidades[cidadeAtual].promocao = nomeTaxa.replace(/\s+/g, ' ').trim();
          } else {
            const valorTaxa = item.Column8 !== undefined ? item.Column8 : '';
            bancosDeDadosCidades[cidadeAtual].taxas.push({ nome: nomeTaxa, valor: valorTaxa });
          }
        }
      }
    });

    dadosCarregados = true;
    esconderEstado();
  })
  .catch(error => {
    console.error("Erro ao carregar banco:", error);
    dadosCarregados = true;
    mostrarEstado('<i class="ph-duotone ph-warning-circle"></i><span class="estado-texto">Erro ao carregar os dados. Recarregue a página.</span>');
  });

// 1.5 Normalização de Texto (Remove Acentos para Busca Tolerante)
function normalizar(texto) {
  return String(texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

// 1.6 Utilitários de Renderização Segura e Destaque
function escaparHtml(texto) {
  return String(texto || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
}

function destacarTermo(texto, termo) {
  const termoNorm = normalizar(termo);
  if (!texto || !termoNorm) return escaparHtml(texto);

  const normText = normalizar(texto);
  const pos = normText.indexOf(termoNorm);
  if (pos === -1) return escaparHtml(texto);

  const html = [];
  let normPos = 0;
  let inMark = false;
  const fim = pos + termoNorm.length;

  for (const ch of texto) {
    const base = ch.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (!inMark && normPos === pos) { html.push('<mark>'); inMark = true; }
    if (inMark && normPos === fim) { html.push('</mark>'); inMark = false; }
    html.push(escaparHtml(ch));
    if (base) normPos++;
  }
  if (inMark) html.push('</mark>');
  return html.join('');
}

// 2. Padronização e Estilização de Tags
function formatarNomeServico(nome) {
  let n = nome.toLowerCase().trim();
  if (n === 'sky/paramout' || n === 'sky/paramount') return 'Sky/Paramount';
  if (n === '01rot.' || n === '1rot.' || n === '01 rot.') return '1 Roteador';
  if (n === '02rot.' || n === '2rot.' || n === '02 rot.') return '2 Roteadores';
  if (n === 'deezer') return 'Deezer';
  if (n === 'max') return 'Max';
  return n.charAt(0).toUpperCase() + n.slice(1);
}

function obterClasseTag(servico) {
  let s = servico.toLowerCase();
  if(s.includes('deezer')) return 'tag-deezer';
  if(s.includes('max')) return 'tag-max';
  if(s.includes('sky')) return 'tag-sky';
  if(s.includes('roteador')) return 'tag-roteador';
  if(s.includes('scm') || s.includes('empresarial')) return 'tag-corp';
  return 'tag-default';
}

// 3. Parsing Avançado
function interpretarPlano(textoPlano) {
  let precoLimpo = 'Consulte';
  let descricao = textoPlano.trim();

  const regexPreco = /[-–\s]*R\$\s*([\d.,]+)/i;
  const matchPreco = descricao.match(regexPreco);

  if (matchPreco) {
    precoLimpo = "R$ " + matchPreco[1];
    descricao = descricao.replace(matchPreco[0], '').trim(); 
  }

  let velocidade = "N/A";
  let servicosFormatados = [];
  let categoria = 'internet';

  if (descricao.toLowerCase().includes('scm') || descricao.toLowerCase().includes('corp')) {
    const matchVelocidade = descricao.match(/^(\d+\s*(?:Mbps|Gbps))/i);
    if (matchVelocidade) {
      velocidade = matchVelocidade[1].replace(/ /g, '');
    }
    servicosFormatados = ["Conexão Multimídia SCM (Empresarial)"];
    categoria = 'corp';
  } else {
    const itensRaw = descricao.split('+').map(i => i.trim()).filter(i => i !== "");
    velocidade = itensRaw.shift() || "N/A";
    velocidade = velocidade.replace("Gbps Mbps", "Gbps").replace(/ /g, '');
    
    servicosFormatados = itensRaw.map(formatarNomeServico);
    const temStreaming = servicosFormatados.some(i => i.includes('Deezer') || i.includes('Max') || i.includes('Sky'));
    categoria = temStreaming ? 'combo' : 'internet';
  }

  return { velocidade, servicos: servicosFormatados, preco: precoLimpo, categoria };
}

// 4. Controle de Filtros
botoesFiltro.forEach(btn => {
  btn.addEventListener('click', (e) => {
    botoesFiltro.forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    filtroAtivo = e.target.getAttribute('data-filter');
    renderizarBusca();
  });
});

// 5. Autocomplete (Sugestões)
function obterSugestoes(termo) {
  const termoNorm = normalizar(termo);
  if (termoNorm.length < 1) return [];
  return Object.values(bancosDeDadosCidades)
    .filter(d => normalizar(d.cidade).includes(termoNorm))
    .slice(0, 8);
}

function renderizarSugestoes() {
  const termo = inputBusca.value.trim();
  if (!dadosCarregados || termo.length === 0) {
    divSugestoes.classList.remove('visible');
    return;
  }

  const sugestoes = obterSugestoes(termo);
  if (sugestoes.length === 0) {
    divSugestoes.innerHTML = '<div class="sugestao-vazia">Nenhuma sugestão para este termo.</div>';
    divSugestoes.classList.add('visible');
    return;
  }

  divSugestoes.innerHTML = sugestoes.map(d => `
    <div class="sugestao-item" data-chave="${d.cidade}">
      <i class="ph-duotone ph-map-pin"></i> ${destacarTermo(d.cidade, termo)}
    </div>
  `).join('');
  divSugestoes.classList.add('visible');
}

function selecionarSugestao(chave) {
  const dados = bancosDeDadosCidades[chave];
  if (!dados) return;
  inputBusca.value = dados.cidade;
  divSugestoes.classList.remove('visible');
  atualizarBotaoLimpar();
  renderizarBusca();
}

divSugestoes.addEventListener('mousedown', (e) => e.preventDefault());

divSugestoes.addEventListener('click', (e) => {
  const item = e.target.closest('.sugestao-item');
  if (item) selecionarSugestao(item.getAttribute('data-chave'));
});

function atualizarBotaoLimpar() {
  btnLimpar.classList.toggle('visible', inputBusca.value.length > 0);
}

btnLimpar.addEventListener('click', () => {
  inputBusca.value = '';
  atualizarBotaoLimpar();
  divSugestoes.classList.remove('visible');
  divContador.classList.remove('visible');
  divResultados.innerHTML = '';
  esconderEstado();
  inputBusca.focus();
});

inputBusca.addEventListener('input', () => {
  atualizarBotaoLimpar();
  renderizarSugestoes();
  renderizarBusca();
});

inputBusca.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const primeiro = divSugestoes.querySelector('.sugestao-item');
    if (primeiro) {
      e.preventDefault();
      selecionarSugestao(primeiro.getAttribute('data-chave'));
    }
  } else if (e.key === 'Escape') {
    divSugestoes.classList.remove('visible');
  }
});

document.addEventListener('click', (e) => {
  if (!e.target.closest('.search-wrapper')) {
    divSugestoes.classList.remove('visible');
  }
});

// 6. Renderização do Painel Completo
function renderizarBusca() {
  const termoDigitado = inputBusca.value.trim();
  divResultados.innerHTML = '';

  if (termoDigitado.length < 2) {
    divContador.classList.remove('visible');
    esconderEstado();
    return;
  }

  if (!dadosCarregados) {
    divContador.classList.remove('visible');
    mostrarEstado('<span class="spinner"></span><span class="estado-texto">Carregando dados das cidades...</span>');
    return;
  }

  const termoNorm = normalizar(termoDigitado);
  const chavesFiltradas = Object.keys(bancosDeDadosCidades).filter(nome => normalizar(nome).includes(termoNorm));

  if (chavesFiltradas.length === 0) {
    divContador.classList.remove('visible');
    mostrarEstado(`<i class="ph-duotone ph-magnifying-glass"></i><span class="estado-texto">Nenhuma cidade encontrada para "<b>${escaparHtml(termoDigitado)}</b>".</span>`);
    return;
  }

  esconderEstado();
  divContador.innerHTML = `<b>${chavesFiltradas.length}</b> ${chavesFiltradas.length === 1 ? 'cidade encontrada' : 'cidades encontradas'}`;
  divContador.classList.add('visible');

  chavesFiltradas.forEach(chave => {
    const dados = bancosDeDadosCidades[chave];
    const planosUnicos = [...new Set(dados.planos)];
    
    const taxasUnicas = dados.taxas.filter((taxa, index, self) =>
      index === self.findIndex((t) => t.nome === taxa.nome)
    );

    const planosProcessados = planosUnicos.map(interpretarPlano);
    const planosFiltrados = planosProcessados.filter(p => filtroAtivo === 'todos' || p.categoria === filtroAtivo);

    // Sorting Lógico
    planosFiltrados.sort((a, b) => {
      const getSpeed = (str) => {
        if (!str || str === "N/A") return 0;
        let val = parseFloat(str.replace(/[^0-9.]/g, ''));
        if (str.toLowerCase().includes('gbps')) val *= 1000;
        return val;
      };

      const getPrice = (str) => {
        if (str.toLowerCase() === 'consulte') return 999999;
        return parseFloat(str.replace('R$', '').replace(/\./g, '').replace(',', '.').trim()) || 0;
      };

      const speedA = getSpeed(a.velocidade);
      const speedB = getSpeed(b.velocidade);

      if (speedA !== speedB) return speedA - speedB;
      return getPrice(a.preco) - getPrice(b.preco);
    });

    // Renderização das Linhas
    const linhasPlanosHtml = planosFiltrados.map(plano => {
      const badgesServicos = plano.servicos.map(s => `<span class="service-tag ${obterClasseTag(s)}">${s}</span>`).join('');
      const visualServicos = badgesServicos || '<span class="plano-sem-servicos">Sem serviços adicionais</span>';
      
      return `
        <div class="plan-row">
          <div class="p-speed">${plano.velocidade}</div>
          <div class="p-services">${visualServicos}</div>
          <div class="price-wrapper">
            <span class="p-price font-mono">${plano.preco}</span>
            <button class="copy-btn" 
                    title="Copiar para WhatsApp"
                    data-cidade="${dados.cidade}"
                    data-velocidade="${plano.velocidade}"
                    data-servicos="${plano.servicos.length > 0 ? plano.servicos.join(', ') : 'Nenhum'}"
                    data-preco="${plano.preco}">
              <i class="ph-duotone ph-copy" style="font-size: 18px;"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');

    // RENDERIZAÇÃO DAS TAXAS COM NEON VERDE
    const taxasHtml = taxasUnicas.map(taxa => {
      let displayValor = '';
      if (taxa.valor !== '') {
        if (isNaN(taxa.valor)) {
          displayValor = `<span class="tax-price font-mono">- ${taxa.valor}</span>`;
        } else {
          displayValor = `<span class="tax-price font-mono">- R$ ${Number(taxa.valor).toFixed(2).replace('.', ',')}</span>`;
        }
      }

      let classeExtra = '';
      let icone = 'ph-receipt'; 
      
      if (taxa.nome.toUpperCase().includes('DESCONTO')) {
        classeExtra = 'tax-discount';
        icone = 'ph-ticket';
      }

      return `<div class="tax-tag ${classeExtra}"><i class="ph-duotone ${icone} tax-icon"></i> ${taxa.nome} ${displayValor}</div>`;
    }).join('');

    // Montagem do Card HTML
    const card = document.createElement('div');
    card.className = 'card card-enter';
    card.innerHTML = `
      <div class="card-header">
        <h3><i class="ph-duotone ph-map-pin"></i> ${destacarTermo(dados.cidade, termoDigitado)}</h3>
        <span class="pop-badge"><i class="ph-duotone ph-share-network"></i> POP: ${escaparHtml(dados.pop)}</span>
      </div>

      ${dados.promocao ? `
        <div class="promo-banner">
          <i class="ph-duotone ph-megaphone promo-icon"></i>
          <span class="promo-text">${escaparHtml(dados.promocao)}</span>
        </div>
      ` : ''}

      <div class="kpi-grid">
        <div class="kpi-box" style="border-top-color: var(--accent-green);">
          <span class="kpi-title">Infraestrutura</span>
          <span class="kpi-value"><span class="pulse-dot"></span> Operacional</span>
        </div>
        <div class="kpi-box" style="border-top-color: var(--accent-cyan);">
          <span class="kpi-title">Tecnologia</span>
          <span class="kpi-value"><i class="ph-duotone ph-broadcast"></i> GPON / Metro</span>
        </div>
        <div class="kpi-box" style="border-top-color: var(--accent-purple);">
          <span class="kpi-title">Matriz Comercial</span>
          <span class="kpi-value"><i class="ph-duotone ph-list-numbers"></i> ${planosProcessados.length} Registros</span>
        </div>
      </div>

      <div class="section-title"><i class="ph-duotone ph-package"></i> Tabela de Provisionamento</div>
      <div class="table-container">
        ${linhasPlanosHtml ? `
          <div class="table-header">
            <div>Velocidade</div>
            <div>Serviços Adicionais</div>
            <div class="valor-col">Valor Mensal</div>
          </div>
          ${linhasPlanosHtml}
        ` : '<div class="sem-planos-aviso">Nenhum plano corresponde ao filtro selecionado.</div>'}
      </div>

      <div class="section-title"><i class="ph-duotone ph-wrench"></i> Taxas e Descontos</div>
      <div class="tax-grid">${taxasHtml || '<span class="taxas-vazias">Nenhuma taxa cadastrada.</span>'}</div>
    `;
    
    divResultados.appendChild(card);
  });
}

// =========================================================
// SISTEMA DE CÓPIA PARA WHATSAPP E TOAST NOTIFICATION
// =========================================================
function mostrarToast(mensagem) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<i class="ph-fill ph-check-circle"></i> ${mensagem}`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'fadeOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

document.addEventListener('click', function(evento) {
  const botao = evento.target.closest('.copy-btn');
  if (!botao) return; 

  const cidade = botao.getAttribute('data-cidade');
  const velocidade = botao.getAttribute('data-velocidade');
  const servicos = botao.getAttribute('data-servicos');
  const preco = botao.getAttribute('data-preco');

  const textoParaCopiar = `📍 *${cidade}*\n🚀 *Plano:* ${velocidade}\n📦 *Serviços:* ${servicos}\n💰 *Valor:* ${preco}`;

  navigator.clipboard.writeText(textoParaCopiar).then(() => {
    mostrarToast('Plano copiado com sucesso!');
  }).catch(erro => {
    console.error('Falha ao copiar:', erro);
    alert('Erro ao copiar. Verifique as permissões do navegador.');
  });
});