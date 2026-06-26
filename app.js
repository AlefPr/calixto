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
      if (!item || item.Column1 === "CIDADE") return;

      if (item.Column1 && typeof item.Column1 === 'string' && item.Column1.trim() !== "") {
        cidadeAtual = item.Column1.trim().toUpperCase();
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
  if (n === '01rot.' || n === '1rot.' || n === '01 rot.') return 'Rota 1';
  if (n === '02rot.' || n === '2rot.' || n === '02 rot.') return 'Rota 2';
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
  if(s.includes('rota')) return 'tag-rota';
  return 'tag-default';
}

// 3. Parsing Matemático
function interpretarPlano(textoPlano) {
  const partes = textoPlano.split('-');
  const precoOriginal = partes.length > 1 ? partes.pop().trim() : 'Consulte';
  const descricao = partes.join('-').trim();
  
  const precoLimpo = precoOriginal.replace(/R\$\s*R\$/g, 'R$').replace(/R\$\s*/g, 'R$ ');

  const itensRaw = descricao.split('+').map(i => i.trim()).filter(i => i !== "");
  
  let velocidade = itensRaw.shift() || "N/A";
  velocidade = velocidade.replace("Gbps Mbps", "Gbps").replace(/ /g, '');

  const servicosFormatados = itensRaw.map(formatarNomeServico);
  const temStreaming = servicosFormatados.some(i => i.includes('Deezer') || i.includes('Max') || i.includes('Sky'));
  const categoria = temStreaming ? 'combo' : 'internet';

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

    // Renderiza Linhas com Tags Coloridas
    const linhasPlanosHtml = planosFiltrados.map(plano => {
      const badgesServicos = plano.servicos.map(s => `<span class="service-tag ${obterClasseTag(s)}">${s}</span>`).join('');
      return `
        <div class="plan-row">
          <div class="p-speed">${plano.velocidade}</div>
          <div class="p-services">${badgesServicos || '<span class="service-tag tag-default" style="opacity: 0.6;">Link Limpo</span>'}</div>
          <div class="p-price font-mono">${plano.preco}</div>
        </div>
      `;
    }).join('');

    // Renderiza Taxas
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
        ${linhasPlanosHtml || '<div style="padding: 20px; color: var(--text-muted); text-align: center; font-size: 14px;">Nenhum plano corresponde ao filtro selecionado.</div>'}
      </div>

      <div class="section-title"><i class="ph-duotone ph-wrench"></i> Taxas Operacionais</div>
      <div class="tax-grid">${taxasHtml || '<span style="color: var(--text-muted); font-size: 14px; padding-left: 5px;">Nenhuma taxa cadastrada.</span>'}</div>
    `;
    
    divResultados.appendChild(card);
  });
}
