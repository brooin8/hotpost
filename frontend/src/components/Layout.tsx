import { Fragment } from 'react';
import { Disclosure, Menu, Transition } from '@headlessui/react';
import { Bars3Icon, XMarkIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import useAuthStore from '../stores/authStore';

const navigation = [
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Products', href: '/products' },
  { name: 'AI Assistant', href: '/ai-assistant' },
  { name: 'Import', href: '/import' },
  { name: 'Settings', href: '/settings' },
];

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen gradient-bg">
      <Disclosure as="nav" className="glass-effect shadow-soft-shadow mobile-nav sticky top-0 z-40">
        {({ open }) => (
          <>
            <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
              <div className="flex h-14 sm:h-16 justify-between items-center">
                <div className="flex items-center">
                  <div className="flex flex-shrink-0 items-center">
                    <Link to="/dashboard" className="text-lg sm:text-xl lg:text-2xl font-bold gradient-text hover-lift">
                      <span className="hidden sm:inline">CrossList Pro</span>
                      <span className="sm:hidden">CrossList</span>
                    </Link>
                  </div>
                  <div className="hidden sm:-my-px sm:ml-6 sm:flex sm:space-x-4 lg:space-x-8">
                    {navigation.map((item) => (
                      <Link
                        key={item.name}
                        to={item.href}
                        className={classNames(
                          location.pathname === item.href
                            ? 'border-primary-400 text-primary-600 bg-primary-50/50 rounded-t-xl'
                            : 'border-transparent text-primary-500 hover:border-primary-300 hover:text-primary-600 hover:bg-primary-50/30 rounded-t-xl',
                          'nav-link inline-flex items-center border-b-2 px-3 lg:px-4 py-2 text-sm font-medium transition-all duration-200 touch-target'
                        )}
                      >
                        {item.name}
                      </Link>
                    ))}
                  </div>
                </div>
                <div className="hidden sm:ml-6 sm:flex sm:items-center">
                  <Menu as="div" className="relative ml-3">
                    <div>
                      <Menu.Button className="flex rounded-full bg-gradient-to-br from-primary-200 to-primary-300 p-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 hover:shadow-coral-glow transition-all duration-300">
                        <span className="sr-only">Open user menu</span>
                        <UserCircleIcon className="h-8 w-8 text-primary-600" />
                      </Menu.Button>
                    </div>
                    <Transition
                      as={Fragment}
                      enter="transition ease-out duration-200"
                      enterFrom="transform opacity-0 scale-95"
                      enterTo="transform opacity-100 scale-100"
                      leave="transition ease-in duration-75"
                      leaveFrom="transform opacity-100 scale-100"
                      leaveTo="transform opacity-0 scale-95"
                    >
                      <Menu.Items className="absolute right-0 z-10 mt-2 w-64 origin-top-right rounded-xl bg-white/95 backdrop-blur-sm py-2 shadow-glow ring-1 ring-primary-200 focus:outline-none animate-scale-in">
                        <div className="px-4 py-3 border-b border-primary-200/50">
                          <div className="text-sm font-semibold text-primary-700">
                            {user?.firstName} {user?.lastName}
                          </div>
                          <div className="text-xs text-primary-500">
                            {user?.email}
                          </div>
                          {user?.ebayUser && (
                            <div className="flex items-center mt-2 pt-2 border-t border-primary-100">
                              <span className="text-lg mr-2">🏪</span>
                              <div>
                                <div className="text-xs text-blue-600 font-medium">
                                  eBay: {user.ebayUser.username || 'Connected'}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                        <Menu.Item>
                          {({ active }) => (
                            <Link
                              to="/settings"
                              className={classNames(
                                active ? 'bg-primary-100/70 text-primary-700' : 'text-primary-600',
                                'block px-4 py-2 text-sm rounded-lg mx-2 my-1 transition-all duration-200 hover:bg-primary-100/70'
                              )}
                            >
                              Settings
                            </Link>
                          )}
                        </Menu.Item>
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              onClick={handleLogout}
                              className={classNames(
                                active ? 'bg-primary-100/70 text-primary-700' : 'text-primary-600',
                                'block w-full px-4 py-2 text-left text-sm rounded-lg mx-2 my-1 transition-all duration-200 hover:bg-primary-100/70'
                              )}
                            >
                              Sign out
                            </button>
                          )}
                        </Menu.Item>
                      </Menu.Items>
                    </Transition>
                  </Menu>
                </div>
                <div className="-mr-2 flex items-center sm:hidden">
                  <Disclosure.Button className="inline-flex items-center justify-center rounded-xl bg-gradient-to-br from-primary-200 to-primary-300 p-2 text-primary-600 hover:shadow-coral-glow hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 transition-all duration-200">
                    <span className="sr-only">Open main menu</span>
                    {open ? (
                      <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
                    ) : (
                      <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
                    )}
                  </Disclosure.Button>
                </div>
              </div>
            </div>

            <Disclosure.Panel className="sm:hidden glass-effect">
              <div className="space-y-1 pb-3 pt-2">
                {navigation.map((item) => (
                  <Disclosure.Button
                    key={item.name}
                    as={Link}
                    to={item.href}
                    className={classNames(
                      location.pathname === item.href
                        ? 'border-primary-400 bg-primary-100/70 text-primary-700 rounded-r-2xl'
                        : 'border-transparent text-primary-600 hover:border-primary-300 hover:bg-primary-50/50 hover:text-primary-700 rounded-r-2xl',
                      'block border-l-4 py-3 pl-3 pr-4 text-base font-medium transition-all duration-200 mx-2'
                    )}
                  >
                    {item.name}
                  </Disclosure.Button>
                ))}
              </div>
              <div className="border-t border-primary-200/50 pb-3 pt-4">
                <div className="flex items-center px-4">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary-300 to-primary-400 flex items-center justify-center">
                      <UserCircleIcon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div className="ml-3">
                    <div className="text-base font-medium text-primary-700">
                      {user?.firstName} {user?.lastName}
                    </div>
                    <div className="text-sm font-medium text-primary-500">
                      {user?.email}
                    </div>
                    {user?.ebayUser && (
                      <div className="flex items-center mt-1">
                        <span className="text-sm mr-1">🏪</span>
                        <div className="text-xs text-blue-600">
                          eBay: {user.ebayUser.username || 'Connected'}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-3 space-y-1">
                  <Disclosure.Button
                    as={Link}
                    to="/settings"
                    className="block px-4 py-2 mx-2 text-base font-medium text-primary-600 hover:bg-primary-100/50 hover:text-primary-700 rounded-xl transition-all duration-200"
                  >
                    Settings
                  </Disclosure.Button>
                  <Disclosure.Button
                    as="button"
                    onClick={handleLogout}
                    className="block w-full px-4 py-2 mx-2 text-left text-base font-medium text-primary-600 hover:bg-primary-100/50 hover:text-primary-700 rounded-xl transition-all duration-200"
                  >
                    Sign out
                  </Disclosure.Button>
                </div>
              </div>
            </Disclosure.Panel>
          </>
        )}
      </Disclosure>

      <div className="py-4 sm:py-6 lg:py-8">
        <main>
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="w-full">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
