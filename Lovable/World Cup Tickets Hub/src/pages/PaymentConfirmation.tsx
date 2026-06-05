import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Check, Download, Printer, Home, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TicketStub, TicketData } from '@/components/TicketStub';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const PaymentConfirmation: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const ticketRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const tickets = useMemo<TicketData[]>(() => location.state?.tickets || [], [location.state]);
  const totalAmount: number = location.state?.totalAmount || 0;

  useEffect(() => {
    if (tickets.length === 0) {
      navigate('/');
      return;
    }
    const timer = setTimeout(() => setShowSuccess(true), 100);
    return () => clearTimeout(timer);
  }, [tickets, navigate]);

  const generatePDF = async (index: number) => {
    const ticketElement = ticketRefs.current[index];
    if (!ticketElement) return;

    setIsDownloading(true);
    try {
      const canvas = await html2canvas(ticketElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [canvas.width, canvas.height],
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`ingresso-fifa2026-${tickets[index].ticketId}.pdf`);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  const generateAllPDFs = async () => {
    setIsDownloading(true);
    try {
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
      });

      for (let i = 0; i < tickets.length; i++) {
        const ticketElement = ticketRefs.current[i];
        if (!ticketElement) continue;

        const canvas = await html2canvas(ticketElement, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
        });

        const imgData = canvas.toDataURL('image/png');
        
        if (i === 0) {
          pdf.internal.pageSize.width = canvas.width;
          pdf.internal.pageSize.height = canvas.height;
        } else {
          pdf.addPage([canvas.width, canvas.height], 'landscape');
        }
        
        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      }

      pdf.save(`ingressos-fifa2026-${Date.now()}.pdf`);
    } catch (error) {
      console.error('Erro ao gerar PDFs:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  const printTicket = (index: number) => {
    const ticketElement = ticketRefs.current[index];
    if (!ticketElement) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Ingresso FIFA 2026</title>
          <style>
            body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          ${ticketElement.outerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  if (tickets.length === 0) {
    return null;
  }

  return (
    <div className="min-h-screen py-12 bg-background">
      <div className="container mx-auto px-4">
        {/* Success Animation */}
        <div className={`text-center mb-12 transition-all duration-700 ${showSuccess ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10'}`}>
          <div className="w-24 h-24 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-6 animate-pulse">
            <div className="w-16 h-16 rounded-full bg-success flex items-center justify-center">
              <Check className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="font-display text-4xl mb-4">
            <span className="gold-text">Pagamento</span> Confirmado!
          </h1>
          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            Sua compra foi realizada com sucesso. Total: <span className="font-bold text-primary">${totalAmount.toLocaleString()}</span>
          </p>
        </div>

        {/* Action Buttons */}
        <div className={`flex flex-wrap justify-center gap-4 mb-12 transition-all duration-700 delay-300 ${showSuccess ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <Button
            onClick={generateAllPDFs}
            disabled={isDownloading}
            className="gold-gradient hover:opacity-90"
            size="lg"
          >
            <Download className="w-5 h-5 mr-2" />
            {isDownloading ? 'Gerando...' : 'Baixar Todos os Ingressos (PDF)'}
          </Button>
          <Link to="/profile">
            <Button variant="outline" size="lg">
              <Ticket className="w-5 h-5 mr-2" />
              Ver Meus Ingressos
            </Button>
          </Link>
          <Link to="/">
            <Button variant="ghost" size="lg">
              <Home className="w-5 h-5 mr-2" />
              Voltar ao Início
            </Button>
          </Link>
        </div>

        {/* Tickets */}
        <div className={`space-y-8 transition-all duration-700 delay-500 ${showSuccess ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <h2 className="font-display text-2xl text-center mb-6">Seus Ingressos</h2>
          
          {tickets.map((ticket, index) => (
            <div key={ticket.ticketId} className="relative">
              {/* Ticket Actions */}
              <div className="flex justify-end gap-2 mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => printTicket(index)}
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Imprimir
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => generatePDF(index)}
                  disabled={isDownloading}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Baixar PDF
                </Button>
              </div>

              {/* Ticket Preview */}
              <div className="overflow-x-auto rounded-xl shadow-lg">
                <TicketStub
                  innerRef={(el: HTMLDivElement | null) => { ticketRefs.current[index] = el; }}
                  ticket={ticket}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PaymentConfirmation;
