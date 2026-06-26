// Referências aos elementos do HTML
const inputBusca = document.getElementById('busca-cidade');
const divResultados = document.getElementById('resultados');

// Variável para armazenar os dados da planilha (JSON)
let dadosCidades = [];

// 1. Carrega os dados do arquivo JSON
fetch('./data/cidades.json')
  .then(response => response.json())
  .then(data => {
    dadosCidades = data;
  })
  .catch(error => console.error("Erro ao carregar os dados:", error));

// 2. Cria o evento de busca em tempo real
inputBusca.addEventListener('input', (evento) => {
  const termoDigitado = evento.target.value.toLowerCase().trim();
  
  // Limpa a tela a cada nova digitação
  divResultados.innerHTML = '';

  // Se apagar tudo ou digitar menos de 2 letras, não mostra nada
  if (termoDigitado.length < 2) return;

  // Filtra as cidades que contêm o termo digitado
  const cidadesFiltradas = dadosCidades.filter(item => 
    item.cidade.toLowerCase().includes(termoDigitado)
  );

  // 3. Renderiza os resultados na tela
  if (cidadesFiltradas.length === 0) {
    divResultados.innerHTML = '<p>Nenhuma cidade encontrada.</p>';
    return;
  }

  cidadesFiltradas.forEach(cidadeData => {
    // Monta as tags dos planos
    const planosHtml = cidadeData.planos.map(plano => 
      `<span class="plan-tag">${plano.nome} - R$ ${plano.valor.toFixed(2)}</span>`
    ).join('');

    // Cria o elemento visual do card
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <h3>${cidadeData.cidade} - ${cidadeData.estado}</h3>
      <p><strong>Serviços:</strong> ${cidadeData.servicos_adicionais.join(', ')}</p>
      <div>${planosHtml}</div>
    `;
    
    // Adiciona o card na tela
    divResultados.appendChild(card);
  });
});