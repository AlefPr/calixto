const inputBusca = document.getElementById('busca-cidade');
const divResultados = document.getElementById('resultados');
const botoesFiltro = document.querySelectorAll('.filter-btn');

let bancosDeDadosCidades = {};
let filtroAtivo = 'todos'; 

// 1. Carregamento de Dados
fetch('./cidades.json')
  .then(response => response.json())
  .then(data => {
    let cidadeAtual = "";
    let popAtual = "";

    data.forEach(item => {
      if (!item) return;

      const colunaCidade = item[""] || item.Column1;
      if (colunaCidade === "CIDADE") return;

      if (colunaCidade && typeof colunaCidade === 'string' && colunaCidade.trim() !== "") {
        cidadeAtual = colunaCidade.trim().toUpperCase();
        popAtual = item.Column2 ? item.Column2.trim() : cidadeAtual;
        
        if (!bancosDeDadosCidades[cidadeAtual]) {
          bancosDeDadosCidades[cidadeAtual] = { cidade: cidadeAtual, pop: popAtual, planos: [], taxas: [] };
        }
      }

      if (cidadeAtual) {
        if (item.Column4 && item.Column4.trim() !== "") bancosDeDadosCidades[cidadeAtual].planos.push(item.Column4.trim());
        if (item.Column5 && item.Column5.trim() !== "") bancosDeDadosCidades[cidadeAtual].planos.push(item.Column5.trim());
        
        if (item.Column7 && item.Column7.trim() !== "") {
          const nomeTaxa = item.Column7.trim();
          const valorTaxa = item.Column8 !== undefined ? item.Column8 : '';
          bancosDeDadosCidades[cidadeAtual].taxas.push({ nome: nomeTaxa, valor: valorTaxa });
        }
      }
    });
  })
  .catch(error => console.error("Erro ao carregar banco:", error));

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

// Retorna a classe CSS correta para colorir a tag
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

  // Extrai o valor em Reais
  const regexPreco = /[-–\s]*R\$\s*([\d.,]+)/i;
  const matchPreco = descricao.match(regexPreco);

  if (matchPreco) {
    precoLimpo = "R$ " + matchPreco[1];
    descricao = descricao.replace(matchPreco[0], '').trim(); 
  }

  let velocidade = "N/A";
  let servicosFormatados = [];
  let categoria = 'internet';

  // Lógica Especial para Planos Empresariais (SCM)
  if (descricao.toLowerCase().includes('scm') || descricao.toLowerCase().includes('corp')) {
    const matchVelocidade = descricao.match(/^(\d+\s*(?:Mbps|Gbps))/i);
    if (matchVelocidade) {
      velocidade = matchVelocidade[1].replace(/ /g, '');
    }
    servicosFormatados = ["Conexão Multimídia SCM (Empresarial)"];
    categoria = 'corp';
  } 
  // Lógica para Planos Residenciais
  else {
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

inputBusca.addEventListener('input', renderizarBusca);

// 5. Renderização do Painel Completo
function renderizarBusca() {
  const termoDigitado = inputBusca.value.toLowerCase().trim();
  divResultados.innerHTML = '';
  if (termoDigitado.length < 2) return;

  const chavesFiltradas = Object.keys(bancosDeDadosCidades).filter(nome => nome.toLowerCase().includes(termoDigitado));
  if (chavesFiltradas.length === 0) return;

  chavesFiltradas.forEach(chave => {
    const dados = bancosDeDadosCidades[chave];
    const planosUnicos = [...new Set(dados.planos)];
    
    const taxasUnicas = dados.taxas.filter((taxa, index, self) =>
      index === self.findIndex((t) => t.nome === taxa.nome)
    );

    const planosProcessados = planosUnicos.map(interpretarPlano);
    const planosFiltrados = planosProcessados.filter(p => filtroAtivo === 'todos' || p.categoria === filtroAtivo);

    // === LÓGICA DE ORDENAÇÃO (Sorting) ===
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

      // Desempata primeiro pela velocidade (menor para maior)
      if (speedA !== speedB) return speedA - speedB;
      // Depois pelo preço (menor para maior)
      return getPrice(a.preco) - getPrice(b.preco);
    });

    // === RENDERIZAÇÃO DAS LINHAS ===
    const linhasPlanosHtml = planosFiltrados.map(plano => {
      const badgesServicos = plano.servicos.map(s => `<span class="service-tag ${obterClasseTag(s)}">${s}</span>`).join('');
      const visualServicos = badgesServicos || '<span style="opacity: 0.4; font-size: 12px; font-style: italic;">Sem serviços adicionais</span>';
      
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

    // === RENDERIZAÇÃO DAS TAXAS ===
    const taxasHtml = taxasUnicas.map(taxa => {
      let displayValor = '';
      if (taxa.valor !== '') {
        if (isNaN(taxa.valor)) {
          displayValor = `<span class="tax-price font-mono">- ${taxa.valor}</span>`;
        } else {
          displayValor = `<span class="tax-price font-mono">- R$ ${Number(taxa.valor).toFixed(2).replace('.', ',')}</span>`;
        }
      }
      return `<div class="tax-tag"><i class="ph-duotone ph-receipt tax-icon"></i> ${taxa.nome} ${displayValor}</div>`;
    }).join('');

    // === MONTAGEM DO CARD FINAL ===
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="card-header">
        <h3><i class="ph-duotone ph-map-pin"></i> ${dados.cidade}</h3>
        <span class="pop-badge"><i class="ph-duotone ph-share-network"></i> POP: ${dados.pop}</span>
      </div>

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
            <div style="text-align: right; padding-right: 35px;">Valor Mensal</div>
          </div>
          ${linhasPlanosHtml}
        ` : '<div style="padding: 20px; color: var(--text-muted); text-align: center; font-size: 14px;">Nenhum plano corresponde ao filtro selecionado.</div>'}
      </div>

      <div class="section-title"><i class="ph-duotone ph-wrench"></i> Taxas Operacionais</div>
      <div class="tax-grid">${taxasHtml || '<span style="color: var(--text-muted); font-size: 14px; padding-left: 5px;">Nenhuma taxa cadastrada.</span>'}</div>
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

