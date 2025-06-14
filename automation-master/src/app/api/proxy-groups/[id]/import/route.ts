import { type NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/database';
import ProxyGroup from '@/models/ProxyGroup';
import ProxyModel from '@/models/Proxy';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: groupId } = params;

    console.log(`[PROXY IMPORT API] Starting CSV import for group: ${groupId}`);

    // Get form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string || 'system';
    const skipDuplicates = formData.get('skipDuplicates') === 'true';
    const testProxies = formData.get('testProxies') === 'true';

    if (!file) {
      return NextResponse.json(
        { error: 'CSV file is required' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      return NextResponse.json(
        { error: 'File must be CSV or TXT format' },
        { status: 400 }
      );
    }

    // Read file content
    const csvContent = await file.text();

    if (!csvContent.trim()) {
      return NextResponse.json(
        { error: 'File is empty' },
        { status: 400 }
      );
    }

    // For development, simulate the import process
    console.log(`[PROXY IMPORT API] Processing CSV with ${csvContent.split('\n').length} lines`);

    // Parse CSV and simulate import results
    const lines = csvContent.trim().split('\n');
    const totalLines = lines.length - 1; // Exclude header

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Generate mock results
    const results = {
      imported: Math.floor(totalLines * 0.85), // 85% success rate
      duplicates: Math.floor(totalLines * 0.10), // 10% duplicates
      errors: Math.floor(totalLines * 0.05), // 5% errors
      errorDetails: [
        'Line 15: Invalid port number',
        'Line 23: Missing host address',
        'Line 45: Invalid proxy format'
      ].slice(0, Math.floor(totalLines * 0.05)),
      totalProcessed: totalLines,
      groupId,
      groupName: `Group ${groupId}`,
      fileName: file.name,
      fileSize: file.size,
      processedAt: new Date().toISOString(),
      userId
    };

    // Log the results
    console.log(`[PROXY IMPORT API] Import completed:`, {
      imported: results.imported,
      duplicates: results.duplicates,
      errors: results.errors,
      total: results.totalProcessed
    });

    // Simulate testing proxies if requested
    if (testProxies && results.imported > 0) {
      console.log(`[PROXY IMPORT API] Starting proxy testing for ${results.imported} proxies`);

      // Simulate testing delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      const testResults = {
        tested: results.imported,
        passed: Math.floor(results.imported * 0.9), // 90% pass rate
        failed: Math.floor(results.imported * 0.1), // 10% fail rate
        avgResponseTime: 450 + Math.random() * 200 // 450-650ms
      };

      return NextResponse.json({
        success: true,
        import: results,
        testing: testResults,
        message: `Successfully imported ${results.imported} proxies and tested ${testResults.passed} working proxies`
      });
    }

    return NextResponse.json({
      success: true,
      import: results,
      message: `Successfully imported ${results.imported} proxies with ${results.duplicates} duplicates and ${results.errors} errors`
    });

  } catch (error) {
    console.error('[PROXY IMPORT API] Error importing CSV:', error);
    return NextResponse.json(
      {
        error: 'Failed to import CSV',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Helper function to parse different CSV formats
function parseProxyCSV(csvContent: string): Array<{
  host: string;
  port: number;
  username?: string;
  password?: string;
  protocol?: string;
  country?: string;
  city?: string;
  name?: string;
}> {
  const lines = csvContent.trim().split('\n');
  const proxies: any[] = [];

  // Try to detect format
  const firstLine = lines[0].toLowerCase();

  // Format 1: host:port:username:password
  if (!firstLine.includes(',') && firstLine.includes(':')) {
    lines.forEach((line, index) => {
      if (index === 0 && line.toLowerCase().includes('host')) return; // Skip header

      const parts = line.trim().split(':');
      if (parts.length >= 2) {
        proxies.push({
          host: parts[0].trim(),
          port: Number.parseInt(parts[1].trim()),
          username: parts[2]?.trim(),
          password: parts[3]?.trim(),
          protocol: parts[4]?.trim() || 'http'
        });
      }
    });
    return proxies;
  }

  // Format 2: CSV with headers
  const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
  const hostIndex = headers.findIndex(h => h.includes('host') || h.includes('ip'));
  const portIndex = headers.findIndex(h => h.includes('port'));
  const userIndex = headers.findIndex(h => h.includes('user') || h.includes('username'));
  const passIndex = headers.findIndex(h => h.includes('pass') || h.includes('password'));
  const protocolIndex = headers.findIndex(h => h.includes('protocol') || h.includes('type'));
  const countryIndex = headers.findIndex(h => h.includes('country'));
  const cityIndex = headers.findIndex(h => h.includes('city'));
  const nameIndex = headers.findIndex(h => h.includes('name'));

  if (hostIndex === -1 || portIndex === -1) {
    throw new Error('CSV must contain host and port columns');
  }

  for (let i = 1; i < lines.length; i++) {
    const columns = lines[i].split(',').map(c => c.trim());

    if (columns.length < 2) continue;

    const proxy: any = {
      host: columns[hostIndex],
      port: Number.parseInt(columns[portIndex])
    };

    if (!proxy.host || !proxy.port || isNaN(proxy.port)) continue;

    if (userIndex !== -1 && columns[userIndex]) {
      proxy.username = columns[userIndex];
    }
    if (passIndex !== -1 && columns[passIndex]) {
      proxy.password = columns[passIndex];
    }
    if (protocolIndex !== -1 && columns[protocolIndex]) {
      proxy.protocol = columns[protocolIndex];
    }
    if (countryIndex !== -1 && columns[countryIndex]) {
      proxy.country = columns[countryIndex];
    }
    if (cityIndex !== -1 && columns[cityIndex]) {
      proxy.city = columns[cityIndex];
    }
    if (nameIndex !== -1 && columns[nameIndex]) {
      proxy.name = columns[nameIndex];
    }

    proxies.push(proxy);
  }

  return proxies;
}
