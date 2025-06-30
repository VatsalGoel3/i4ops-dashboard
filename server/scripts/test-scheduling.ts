import { PrismaClient, PipelineStage } from '@prisma/client';

const prisma = new PrismaClient();

async function testScheduling() {
  try {
    console.log('🧪 Testing host scheduling system...');

    // Get existing hosts
    const hosts = await prisma.host.findMany({
      take: 5 // Test with first 5 hosts
    });

    if (hosts.length === 0) {
      console.log('❌ No hosts found. Please create some hosts first.');
      return;
    }

    console.log(`📋 Found ${hosts.length} hosts to test with`);

    // Test different scheduling scenarios
    const testScenarios = [
      {
        name: 'Alice - Expired Assignment',
        assignedTo: 'Alice',
        assignedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        assignedUntil: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago (expired)
        pipelineStage: PipelineStage.active
      },
      {
        name: 'Bob - Active Assignment',
        assignedTo: 'Bob',
        assignedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        assignedUntil: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours from now
        pipelineStage: PipelineStage.installing
      },
      {
        name: 'Charlie - Long-term Assignment',
        assignedTo: 'Charlie',
        assignedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
        assignedUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
        pipelineStage: PipelineStage.reserved
      },
      {
        name: 'Diana - No Assignment',
        assignedTo: null,
        assignedAt: null,
        assignedUntil: null,
        pipelineStage: PipelineStage.unassigned
      },
      {
        name: 'Eve - Expiring Soon',
        assignedTo: 'Eve',
        assignedAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
        assignedUntil: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
        pipelineStage: PipelineStage.active
      }
    ];

    // Apply test scenarios to hosts
    for (let i = 0; i < Math.min(hosts.length, testScenarios.length); i++) {
      const host = hosts[i];
      const scenario = testScenarios[i];

      console.log(`🔄 Updating ${host.name} with scenario: ${scenario.name}`);

      await prisma.host.update({
        where: { id: host.id },
        data: {
          assignedTo: scenario.assignedTo,
          assignedAt: scenario.assignedAt,
          assignedUntil: scenario.assignedUntil,
          pipelineStage: scenario.pipelineStage,
          notes: `Test scenario: ${scenario.name}`
        }
      });
    }

    console.log('✅ Scheduling test data applied successfully!');
    console.log('\n📊 Test scenarios applied:');
    testScenarios.forEach((scenario, i) => {
      if (i < hosts.length) {
        console.log(`  ${i + 1}. ${hosts[i].name} → ${scenario.name}`);
      }
    });

    console.log('\n🎯 You can now test the scheduling features in the dashboard:');
    console.log('  - Check the Dashboard for expired assignments');
    console.log('  - View assignment status in the Hosts table');
    console.log('  - Test the scheduling modal in Host Details');
    console.log('  - Navigate to expired assignments via Critical KPIs');

  } catch (error) {
    console.error('❌ Error testing scheduling:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testScheduling(); 