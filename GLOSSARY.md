# Eldo Eletrostática

Site institucional e gestão interna de uma empresa de pintura eletrostática: vitrine pública, orçamentos, ordens de serviço, estoque e vendas. Cada termo abaixo é o nome em inglês usado no código, com o termo do negócio entre parênteses.

## Language

### Clientes e atendimento

**Customer** (cliente):
Pessoa ou empresa que contrata um serviço de pintura.
_Avoid_: client, user

**IndividualCustomer** (cliente PF):
Cliente pessoa física, atendido por WhatsApp.
_Avoid_: person, pf

**BusinessCustomer** (cliente PJ):
Cliente pessoa jurídica, identificado pelo CNPJ e atendido por e-mail.
_Avoid_: company, corporate, pj

**ContactRequest** (solicitação de contato):
Mensagem que o cliente PF envia pelo formulário de contato para ser atendido por uma pessoa.
_Avoid_: lead, message

**Review** (avaliação):
Avaliação pública da empresa no Google, exibida no site.
_Avoid_: testimonial, feedback, rating

### Orçamento

**Quote** (orçamento):
Proposta de preço da empresa para um pedido de pintura.
_Avoid_: budget (em inglês, budget é a verba disponível de alguém, outro sentido)

**QuoteRequest** (solicitação de orçamento):
Pedido de orçamento de um cliente PJ, feito por upload de PDF ou pelo simulador.
_Avoid_: order, inquiry

**QuoteEstimator** (simulador de orçamento):
Ferramenta opcional que calcula uma faixa de preço a partir do tipo de pintura, do material da peça e da área; o administrador pode desativá-la.
_Avoid_: calculator, simulator

**PriceRange** (faixa de preço):
Resultado do simulador: um valor mínimo e um máximo, nunca um valor único.
_Avoid_: estimate, price

**PricingRule** (regra de cálculo):
Valor por m² de um tipo de pintura ou de um material, configurado pelo administrador.
_Avoid_: price table, rate

**PaintType** (tipo de pintura):
Tinta ou acabamento oferecido pela empresa, como epóxi ou poliéster.
_Avoid_: coating, finish

**PartMaterial** (material da peça):
Material da peça que o cliente quer pintar, como aço ou alumínio.
_Avoid_: material (sozinho, confunde com os materiais de estoque)

### Serviço

**ServiceOrder** (ordem de serviço, OS):
Serviço contratado, acompanhado do cadastro até a entrega.
_Avoid_: job, order, project

**ServiceOrderStatus** (status da OS):
Etapa da OS: `queued` (em fila), `inProduction` (em produção), `finishing` (em finalização) ou `completed` (concluído).
_Avoid_: state, phase

**TrackingCode** (protocolo):
Código que o cliente usa para consultar o status da sua OS sem login.
_Avoid_: protocol, ticket

### Vitrine

**PortfolioCategory** (categoria):
Agrupador de projetos do portfólio, composto só de texto.
_Avoid_: tag, section

**PortfolioProject** (projeto do portfólio):
Trabalho já realizado exibido na vitrine, sempre com imagem.
_Avoid_: work, job, project (sozinho)

**CompanyEvent** (evento):
Ação ou evento de que a empresa participou, exibido em linha do tempo.
_Avoid_: event (sozinho, colide com os eventos do DOM e do Node)

### Gestão interna

**Employee** (funcionário):
Pessoa da empresa com acesso à área interna.
_Avoid_: staff, worker

**Role** (nível de acesso):
Conjunto de permissões de um funcionário, definido na US10.
_Avoid_: permission level, profile

**InventoryItem** (item de estoque):
Tinta, insumo ou material controlado no estoque, com quantidade, categoria e fornecedor.
_Avoid_: product, stock item

**StockMovement** (movimentação de estoque):
Entrada (`inbound`) ou saída (`outbound`) de um item de estoque.
_Avoid_: transaction

**Supplier** (fornecedor):
Empresa que fornece itens de estoque.
_Avoid_: vendor, provider

**Sale** (venda):
Fechamento de negócio, vinculado a um orçamento aprovado.
_Avoid_: deal, order

**CommissionRule** (regra de comissão):
Percentual ou valor fixo de comissão, por funcionário, tipo de serviço ou faixa de valor.
_Avoid_: bonus, fee
