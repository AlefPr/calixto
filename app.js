const inputBusca = document.getElementById('busca-cidade');
const divResultados = document.getElementById('resultados');
const botoesFiltro = document.querySelectorAll('.filter-btn');

let bancosDeDadosCidades = {};
let filtroAtivo = 'todos'; // todos, internet, combo

// 1. Carregamento e Estruturação de Dados
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
          const valorTaxa = item.Column8 !== undefined ? ` - R$ ${item.Column8}` : '';
          bancosDeDadosCidades[cidadeAtual].taxas.push(`${item.Column7.trim()}${valorTaxa}`);
        }
      }
    });
  })
  .catch(error => console.error("Erro ao carregar banco:", error));

// 2. Inteligência de Parsing (Quebra o texto do plano em partes lógicas)
function interpretarPlano(textoPlano) {
  // Separa o preço pelo último hífen
  const partes = textoPlano.split('-');
  const precoOriginal = partes.length > 1 ? partes.pop().trim() : 'Consulte';
  const descricao = partes.join('-').trim(); // O resto antes do hífen
  
  // Limpa o preço (tira o R$ repetido se houver)
  const precoLimpo = precoOriginal.replace(/R\$\s*R\$/g, 'R$').replace(/R\$\s*/g, 'R$ ');

  // Separa velocidade dos serviços usando o '+'
  const itens = descricao.split('+').map(i => i.trim()).filter(i => i !== "");
  
  // Trata a velocidade (primeiro item) limpando redundâncias (ex: Gbps Mbps)
  let velocidade = itens.shift() || "N/A";
  velocidade = velocidade.replace("Gbps Mbps", "Gbps").replace(/ /g, '');

  // Define a categoria para os filtros
  const temStreaming = itens.some(i => i.toLowerCase().includes('deezer') || i.toLowerCase().includes('max') || i.toLowerCase().includes('sky'));
  const categoria = temStreaming ? 'combo' : 'internet';

  return { velocidade, servicos: itens, preco: precoLimpo, categoria };
}

// 3. Controle dos Filtros (Toggles)
botoesFiltro.forEach(btn => {
  btn.addEventListener('click', (e) => {
    botoesFiltro.forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    filtroAtivo = e.target.getAttribute('data-filter');
    renderizarBusca(); // Refaz a busca ao clicar no filtro
  });
});

inputBusca.addEventListener('input', renderizarBusca);

// 4. Renderização do Layout NOC
function renderizarBusca() {
  const termoDigitado = inputBusca.value.toLowerCase().trim();
  divResultados.innerHTML = '';
  if (termoDigitado.length < 2) return;

  const chavesFiltradas = Object.keys(bancosDeDadosCidades).filter(nome => nome.toLowerCase().includes(termoDigitado));
  if (chavesFiltradas.length === 0) return;

  chavesFiltradas.forEach(chave => {
    const dados = bancosDeDadosCidades[chave];
    const planosUnicos = [...new Set(dados.planos)];
    const taxasUnicas = [...new Set(dados.taxas)];

    // Processa e filtra os planos
    const planosProcessados = planosUnicos.map(interpretarPlano);
    const planosFiltrados = planosProcessados.filter(p => filtroAtivo === 'todos' || p.categoria === filtroAtivo);

    // Monta o HTML das linhas da tabela
    const linhasPlanosHtml = planosFiltrados.map(plano => {
      const badgesServicos = plano.servicos.map(s => `<span class="service-tag">${s}</span>`).join('');
      return `
        <div class="plan-row">
          <div class="p-speed">${plano.velocidade}</div>
          <div class="p-services">${badgesServicos || '<span style="opacity: 0.5">Link Limpo</span>'}</div>
          <div class="p-price">${plano.preco}</div>
        </div>
      `;
    }).join('');

    // Monta o HTML das Taxas
    const taxasHtml = taxasUnicas.map(taxa => `<div class="tax-tag"><i class="ph ph-wrench"></i> ${taxa}</div>`).join('');

    // Conta total de planos ativos para o Card de KPI
    const totalPlanos = planosProcessados.length;

    // Constrói o Card
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="card-header">
        <h3><i class="ph ph-map-pin"></i> ${dados.cidade}</h3>
        <span class="pop-badge"><i class="ph ph-server"></i> POP: ${dados.pop}</span>
      </div>

      <div class="kpi-grid">
        <div class="kpi-box"><span class="kpi-title">Status Infra</span><span class="kpi-value" style="color: var(--accent-green);"><i class="ph ph-check-circle"></i> Operacional</span></div>
        <div class="kpi-title">Tecnologia</span><span class="kpi-value"><i class="ph ph-broadcast"></i> GPON / Metro</span></div>
        <div class="kpi-box"><span class="kpi-title">Planos Catalogados</span><span class="kpi-value"><i class="ph ph-list-numbers"></i> ${totalPlanos} listados</span></div>
      </div>

      <div class="section-title"><i class="ph ph-package"></i> Matriz de Planos (${filtroAtivo})</div>
      <div style="background: var(--bg-kpi); border: 1px solid var(--border-color); border-radius: 8px; margin-bottom: 20px; overflow: hidden;">
        ${linhasPlanosHtml || '<div style="padding: 15px; color: var(--text-muted); text-align: center;">Nenhum plano para o filtro selecionado.</div>'}
      </div>

      <div class="section-title"><i class="ph ph-receipt"></i> Tabela de Taxas</div>
      <div class="tax-grid">${taxasHtml}</div>
    `;
    
    divResultados.appendChild(card);
  });
}
