'use client';

import { cn } from '@/lib/utils';
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React from 'react'

import { Button } from "@/components/ui/button"


const navItens: {name: string, href: string}[] = [
    {name: 'Painel', href: '/dashboard'},
    {name: 'Planos', href: '/pricing'},
    {name: 'Politicas de Privacidade', href: '/privacy'},
]

function Header() {
    const pathname = usePathname();

    const user = true;

  return (
    <header className='sticky px-4 top-0 z-50 w-full border-b bg-background/95 backdrop-blur'>
        <div className='container flex h-16 items-center'>
            <div className='mr-4 hidden md:flex'>
                <Link href={"/"} className='mr-6 flex items-center space-x-2'>
                LOGO
                </Link>
                <nav className='flex items-center space-x-7 text-sm font-medium'>
                {navItens.map((item) => (
                    <Link key={item.name} href={item.href} className={cn('transition-colors hover:text-foreground/80', pathname === item.href ? 'text-foreground' : "text-foreground/60")} >
                        {item.name}
                    </Link>
                ))}
                </nav>
            </div>

            <div>
                <div className='flex flex-1 items-center justify-between space-x-2 md:justify-end'>
                    <div className='w-full flex-1 md:w-auto md:flex-none space-x-2 hidden md:flex'>
                    <Button>Button</Button>
                    </div>
                </div>
            </div>

        </div>
    </header>
  )
}

export default Header
