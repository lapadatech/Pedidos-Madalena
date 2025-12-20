import React from 'react';
import { Button } from '@/shared/ui/button';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Atualiza o state para que a próxima renderização mostre a UI de fallback.
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Você também pode logar o erro para um serviço de reporte de erros
    console.error('Uncaught error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      // Você pode renderizar qualquer UI de fallback
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-100 p-4 text-center">
          <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Ocorreu um erro inesperado.</h1>
            <p className="text-gray-700 mb-6">
              Nossa equipe já foi notificada. Tente recarregar a página ou voltar para a tela
              inicial.
            </p>
            <Button
              onClick={() => window.location.reload()}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              Recarregar a Página
            </Button>
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-4 text-left text-xs text-gray-500 bg-gray-50 p-2 rounded">
                <summary>Detalhes do Erro (Modo de Desenvolvimento)</summary>
                <pre className="mt-2 whitespace-pre-wrap break-all">
                  {this.state.error && this.state.error.toString()}
                  <br />
                  {this.state.errorInfo && this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
