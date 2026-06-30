'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Contract, ContractStatus } from '@/lib/types';

const STATUS_LABEL: Record<ContractStatus, string> = {
  DRAFT: 'Rascunho',
  ACTIVE: 'Ativo',
  CLOSED: 'Encerrado',
};

const STATUS_BG: Record<ContractStatus, string> = {
  DRAFT: 'bg-yellow-300',
  ACTIVE: 'bg-accent',
  CLOSED: 'bg-secondary',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR');
}

function previewValues(contract: Contract) {
  return (
    contract.values
      .slice(0, 2)
      .map((v) => `${v.fieldName}: ${v.value}`)
      .join(' · ') || '—'
  );
}

export function ContractTable({ contracts }: { contracts: Contract[] }) {
  return (
    <div className="flex flex-col gap-3">
      {contracts.map((contract, i) => (
        <motion.div
          key={contract.id}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{
            type: 'spring',
            stiffness: 400,
            damping: 30,
            delay: Math.min(i * 0.04, 0.3),
          }}
          whileHover={{ x: -3, y: -3 }}
          className="brutal-block flex flex-wrap items-center gap-4 p-4"
        >
          <span className="font-mono text-xs text-muted-foreground">
            {formatDate(contract.createdAt)}
          </span>

          <Badge className={`${STATUS_BG[contract.status]} text-foreground`}>
            {STATUS_LABEL[contract.status]}
          </Badge>

          <span className="flex-1 truncate text-sm font-medium">{previewValues(contract)}</span>

          <Button variant="outline" size="sm" asChild>
            <Link href={`/contracts/${contract.id}`}>
              Detalhe <ArrowUpRight className="size-3.5" />
            </Link>
          </Button>
        </motion.div>
      ))}
    </div>
  );
}
