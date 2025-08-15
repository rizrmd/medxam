import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  FileText, 
  BarChart3, 
  Clock, 
  Users, 
  FileSpreadsheet,
  Mail,
  Award
} from 'lucide-react'
import { apiClient } from '@/lib/api'

interface DeliveryReportsProps {
  deliveryId: string
  delivery: any
}

export function DeliveryReports({ deliveryId }: DeliveryReportsProps) {
  const [generating, setGenerating] = useState<string | null>(null)

  const handleGenerateReport = async (reportType: string) => {
    setGenerating(reportType)
    
    try {
      // Simulate report generation
      // In a real app, this would call an API endpoint to generate the report
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // For now, just show a success message
      alert(`${reportType} report generated successfully!`)
    } catch (err) {
      console.error('Failed to generate report:', err)
      alert('Failed to generate report')
    } finally {
      setGenerating(null)
    }
  }

  const handleExport = async (format: string) => {
    setGenerating(`export-${format}`)
    
    try {
      // In a real app, this would call an API endpoint to export data
      const response = await apiClient.get(`/deliveries/${deliveryId}/attempts`)
      
      if ((response as any).data) {
        // For demonstration, we'll create a simple CSV
        if (format === 'excel') {
          const attempts = (response as any).data.items || []
          const csv = [
            ['Name', 'Email', 'Status', 'Score', 'Started At', 'Completed At'],
            ...attempts.map((a: any) => [
              a.participant?.name || 'Unknown',
              a.participant?.email || '-',
              a.status,
              a.score || '-',
              a.started_at || '-',
              a.ended_at || '-'
            ])
          ].map(row => row.join(',')).join('\n')
          
          // Download the CSV
          const blob = new Blob([csv], { type: 'text/csv' })
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `delivery-${deliveryId}-report.csv`
          a.click()
          window.URL.revokeObjectURL(url)
        } else {
          alert(`${format} export will be implemented soon`)
        }
      }
    } catch (err) {
      console.error('Failed to export:', err)
      alert('Failed to export data')
    } finally {
      setGenerating(null)
    }
  }

  const reportCards = [
    {
      title: 'Attendance Report',
      description: 'View who attended and who was absent',
      icon: FileText,
      action: () => handleGenerateReport('Attendance'),
      color: 'text-blue-600 bg-blue-50'
    },
    {
      title: 'Progress Report',
      description: 'Analyze participant progress and completion rates',
      icon: BarChart3,
      action: () => handleGenerateReport('Progress'),
      color: 'text-green-600 bg-green-50'
    },
    {
      title: 'Time Analysis',
      description: 'Review time spent per question and section',
      icon: Clock,
      action: () => handleGenerateReport('Time Analysis'),
      color: 'text-orange-600 bg-orange-50'
    },
    {
      title: 'Participant Summary',
      description: 'Detailed overview of all participants',
      icon: Users,
      action: () => handleGenerateReport('Participant Summary'),
      color: 'text-purple-600 bg-purple-50'
    }
  ]

  const exportOptions = [
    {
      title: 'Export to Excel',
      description: 'Download data in Excel format',
      icon: FileSpreadsheet,
      action: () => handleExport('excel'),
      color: 'text-green-600'
    },
    {
      title: 'Export to PDF',
      description: 'Generate PDF report',
      icon: FileText,
      action: () => handleExport('pdf'),
      color: 'text-red-600'
    },
    {
      title: 'Generate Certificates',
      description: 'Create completion certificates',
      icon: Award,
      action: () => handleExport('certificates'),
      color: 'text-yellow-600'
    },
    {
      title: 'Email Results',
      description: 'Send results to participants',
      icon: Mail,
      action: () => handleExport('email'),
      color: 'text-blue-600'
    }
  ]

  return (
    <div className="space-y-6 pt-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold mb-4">Quick Reports</h3>
          <div className="space-y-3">
            {reportCards.map((report) => (
              <Card key={report.title} className="hover:shadow-md transition-shadow cursor-pointer"
                   onClick={report.action}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${report.color}`}>
                      <report.icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">{report.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {report.description}
                      </p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      disabled={generating === report.title}
                    >
                      {generating === report.title ? 'Generating...' : 'Generate'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-4">Export Options</h3>
          <Card>
            <CardContent className="p-6 space-y-3">
              {exportOptions.map((option) => (
                <Button
                  key={option.title}
                  variant="outline"
                  className="w-full justify-start"
                  onClick={option.action}
                  disabled={generating === `export-${option.title.toLowerCase().replace(' to ', '')}`}
                >
                  <option.icon className={`h-4 w-4 mr-2 ${option.color}`} />
                  <div className="text-left">
                    <div className="font-medium">{option.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {option.description}
                    </div>
                  </div>
                  {generating === `export-${option.title.toLowerCase().replace(' to ', '')}` && (
                    <span className="ml-auto text-sm">Processing...</span>
                  )}
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Report History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No reports generated yet</p>
            <p className="text-sm mt-2">Generated reports will appear here</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}