// Referências aos elementos da tela
const inputBusca = document.getElementById('busca-cidade');
const divResultados = document.getElementById('resultados');

// Armazenará os dados agrupados por cidade nos bastidores
let bancosDeDadosCidades = {};

// 1. Carrega e estrutura o JSON corrido
fetch('./cidades.json')
  .then(response => {
    if (!response.ok) throw new Error(`Erro HTTP: status ${response.status}`);
    return response.json();
  })
  .then(data => {
    let cidadeAtual = "";
    let popAtual = "";

    data.forEach(item => {
      // Ignora linhas nulas ou linhas de cabeçalho da planilha
      if (!item || item.Column1 === "CIDADE") return;

      // Se a linha tem uma nova cidade, atualiza a cidade ativa no laço
      if (item.Column1 && typeof item.Column1 === 'string' && item.Column1.trim() !== "") {
        cidadeAtual = item.Column1.trim().toUpperCase();
        popAtual = item.Column2 ? item.Column2.trim() : cidadeAtual;
        
        // Inicializa a estrutura da cidade se ela não existir
        if (!bancosDeDadosCidades[cidadeAtual]) {
          bancosDeDadosCidades[cidadeAtual] = {
            cidade: cidadeAtual,
            pop: popAtual,
            planos: [],
            taxas: []
          };
        }
      }

      // Se temos uma cidade ativa, agrupamos os planos e taxas desta linha
      if (cidadeAtual) {
        // Coleta planos da Column4 e Column5
        if (item.Column4 && item.Column4.trim() !== "") {
          bancosDeDadosCidades[cidadeAtual].planos.push(item.Column4.trim());
        }
        if (item.Column5 && item.Column5.trim() !== "") {
          bancosDeDadosCidades[cidadeAtual].planos.push(item.Column5.trim());
        }
        
        // Coleta taxas e serviços (Column7 + Column8 se houver valor)
        if (item.Column7 && item.Column7.trim() !== "") {
          const valorTaxa = item.Column8 !== undefined ? ` (R$ ${item.Column8})` : '';
          bancosDeDadosCidades[cidadeAtual].taxas.push(`${item.Column7.trim()}${valorTaxa}`);
        }
      }
    });

    console.log("Dados processados com sucesso!", bancosDeDadosCidades);
  })
  .catch(error => {
    console.error("Erro ao carregar o arquivo JSON:", error);
    divResultados.innerHTML = `<p class="sem-resultado">Erro ao carregar banco de dados.</p>`;
  });

// 2. Evento de busca em tempo real
inputBusca.addEventListener('input', (evento) => {
  const termoDigitado = evento.target.value.toLowerCase().trim();
  
  divResultados.innerHTML = '';

  // Só pesquisa com 2 ou mais letras
  if (termoDigitado.length < 2) return;

  // Filtra as chaves do objeto (nomes das cidades) que batem com a busca
  const chavesFiltradas = Object.keys(bancosDeDadosCidades).filter(nomeCidade => 
    nomeCidade.toLowerCase().includes(termoDigitado)
  );

  if (chavesFiltradas.length === 0) {
    divResultados.innerHTML = '<p class="sem-resultado">Nenhuma cidade encontrada com esse nome.</p>';
    return;
  }

  // 3. Renderiza os blocos organizados na tela
  chavesFiltradas.forEach(chave => {
    const dados = bancosDeDadosCidades[chave];

    // Remove duplicatas de planos se houverem na listagem
    const planosUnicos = [...new Set(dados.planos)];
    const taxasUnicas = [...new Set(dados.taxas)];

    // Monta as tags visuais de planos
    const planosHtml = planosUnicos.map(plano => 
      `<span class="plan-tag">📦 ${plano}</span>`
    ).join('');

    // Monta as tags visuais de taxas e serviços
    const taxasHtml = taxasUnicas.map(taxa => 
      `<span class="plan-tag" style="border-color: #e2a03f; color: #f4b455;">⚙️ ${taxa}</span>`
    ).join('');

    // Cria o card unificado na tela
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <h3>📍 ${dados.cidade}</h3>
      <p style="font-size: 14px; color: #7c7c8a; margin-top: -5px; margin-bottom: 15px;">
        <strong>Atendimento (POP):</strong> ${dados.pop}
      </p>
      
      <h4>Planos Disponíveis</h4>
      <div class="plan-container" style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px;">
        ${planosHtml || '<span class="sem-resultado">Nenhum plano listado</span>'}
      </div>

      <h4>Taxas e Serviços</h4>
      <div class="plan-container" style="display: flex; flex-wrap: wrap; gap: 8px;">
        ${taxasHtml || '<span class="sem-resultado">Nenhuma taxa listada</span>'}
      </div>
    `;
    
    divResultados.appendChild(card);
  });
});
