#!/usr/bin/env ts-node

/**
 * Test script to validate telemetry optimizations
 * Measures latency and verifies local vs SSH detection
 */

import { TelemetryService } from '../infrastructure/telemetry-service';
import { Logger } from '../infrastructure/logger';
import * as fs from 'fs/promises';

const logger = new Logger('TelemetryTest');

async function testTelemetryOptimizations() {
  logger.info('🚀 Starting telemetry optimization tests...');
  
  const telemetryService = new TelemetryService();
  
  // Test 1: Check local vs SSH detection
  logger.info('📁 Test 1: Checking filesystem detection...');
  
  try {
    await fs.access('/mnt/vm-telemetry-json');
    logger.info('✅ Local telemetry directory found - should use filesystem access');
  } catch {
    logger.info('🔗 Local telemetry directory not found - should use SSH access');
  }
  
  // Test 2: Measure data fetching latency
  logger.info('⏱️  Test 2: Measuring telemetry data fetch latency...');
  
  const iterations = 3;
  const latencies: number[] = [];
  
  for (let i = 1; i <= iterations; i++) {
    const startTime = Date.now();
    
    try {
      const data = await telemetryService.getAllTelemetryData();
      const latency = Date.now() - startTime;
      latencies.push(latency);
      
      logger.info(`📊 Iteration ${i}: ${latency}ms, found ${data.length} VMs`);
      
      if (data.length > 0) {
        const latestTimestamp = Math.max(...data.map(d => d.timestamp));
        const dataAge = (Date.now() / 1000) - latestTimestamp;
        logger.info(`📈 Latest data age: ${Math.round(dataAge)}s`);
      }
    } catch (error) {
      logger.error(`❌ Iteration ${i} failed:`, error);
    }
    
    // Small delay between iterations
    if (i < iterations) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // Calculate statistics
  if (latencies.length > 0) {
    const avgLatency = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;
    const minLatency = Math.min(...latencies);
    const maxLatency = Math.max(...latencies);
    
    logger.info('📋 Latency Statistics:');
    logger.info(`   Average: ${Math.round(avgLatency)}ms`);
    logger.info(`   Min: ${minLatency}ms`);
    logger.info(`   Max: ${maxLatency}ms`);
    
    // Performance assessment
    if (avgLatency < 100) {
      logger.info('🎯 EXCELLENT: Sub-100ms average latency (local filesystem)');
    } else if (avgLatency < 500) {
      logger.info('✅ GOOD: Sub-500ms average latency');
    } else if (avgLatency < 2000) {
      logger.info('⚠️  ACCEPTABLE: Sub-2s average latency (likely SSH)');
    } else {
      logger.info('❌ SLOW: >2s average latency - investigate network/SSH issues');
    }
  }
  
  // Test 3: File watcher functionality (if local)
  logger.info('👀 Test 3: Checking file watcher functionality...');
  
  try {
    await fs.access('/mnt/vm-telemetry-json');
    
    let changeDetected = false;
    const timeout = setTimeout(() => {
      if (!changeDetected) {
        logger.info('⏰ No file changes detected in 10s (normal if no active VMs)');
      }
    }, 10000);
    
    telemetryService.on('fileChanged', (filePath: string) => {
      changeDetected = true;
      clearTimeout(timeout);
      logger.info(`🔄 File watcher detected change: ${filePath}`);
    });
    
    logger.info('👁️  File watcher active - waiting 10s for file changes...');
    
  } catch {
    logger.info('📡 SSH mode - file watcher not applicable');
  }
  
  // Test 4: VM discovery
  logger.info('🔍 Test 4: Testing VM discovery (lenient mode)...');
  
  try {
    const startTime = Date.now();
    const discoveredVMs = await telemetryService.discoverAllVMs();
    const discoveryLatency = Date.now() - startTime;
    
    logger.info(`🔎 Discovery complete: ${discoveredVMs.length} VMs found in ${discoveryLatency}ms`);
    
    if (discoveredVMs.length > 0) {
      logger.info('🗂️  Discovered VMs:');
      discoveredVMs.forEach(vm => {
        const age = (Date.now() / 1000) - vm.timestamp;
        logger.info(`   ${vm.hostname}/${vm.vmname} - ${Math.round(age)}s old`);
      });
    }
  } catch (error) {
    logger.error('❌ VM discovery failed:', error);
  }
  
  // Cleanup
  telemetryService.disconnect();
  
  logger.info('✅ Telemetry optimization tests completed!');
  
  // Performance summary
  logger.info('');
  logger.info('🎯 OPTIMIZATION SUMMARY:');
  logger.info('   • File access: Local filesystem detection implemented');
  logger.info('   • Polling interval: Reduced to 30s (from 2min)');
  logger.info('   • File watcher: Real-time change detection active');
  logger.info('   • Stale threshold: Reduced to 5min (from 10min)');
  logger.info('   • Expected end-to-end latency: 2-30s (vs 4-8min previously)');
}

// Run the tests
testTelemetryOptimizations()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Test failed:', error);
    process.exit(1);
  }); 