'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface SavedProject {
  id: string;
  name: string;
  builder: string;
  location: string;
  price: string;
  image: string;
  savedAt: string;
}

interface VisitRequest {
  id: string;
  projectName: string;
  builderName: string;
  visitDate: string;
  status: 'pending' | 'confirmed' | 'completed';
  bookedAt: string;
}

export default function DashboardPage() {
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);
  const [visitRequests, setVisitRequests] = useState<VisitRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [projectsRes, visitsRes] = await Promise.all([
          fetch('/api/saved'),
          fetch('/api/visit-requests'),
        ]);

        const projects = await projectsRes.json()
const visits = await visitsRes.json()
setSavedProjects(projects?.savedProjects ?? [])
setVisitRequests(visits ?? [])
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#09090b] overflow-hidden">
        {/* Aurora Background */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute inset-0 opacity-30"
            animate={{
              background: [
                'radial-gradient(ellipse 80% 80% at 20% 50%, rgba(61, 232, 160, 0.15) 0%, rgba(9, 9, 11, 0) 50%)',
                'radial-gradient(ellipse 80% 80% at 60% 30%, rgba(61, 232, 160, 0.1) 0%, rgba(9, 9, 11, 0) 50%)',
                'radial-gradient(ellipse 80% 80% at 80% 70%, rgba(61, 232, 160, 0.15) 0%, rgba(9, 9, 11, 0) 50%)',
                'radial-gradient(ellipse 80% 80% at 20% 50%, rgba(61, 232, 160, 0.15) 0%, rgba(9, 9, 11, 0) 50%)',
              ],
            }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 py-20">
          <div className="h-8 w-48 bg-white/10 rounded animate-pulse mb-8" />
          <div className="grid grid-cols-3 gap-4 mb-12">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-white/5 border border-white/10 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#09090b] overflow-hidden">
      {/* Aurora Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute inset-0 opacity-30"
          animate={{
            background: [
              'radial-gradient(ellipse 80% 80% at 20% 50%, rgba(61, 232, 160, 0.15) 0%, rgba(9, 9, 11, 0) 50%)',
              'radial-gradient(ellipse 80% 80% at 60% 30%, rgba(61, 232, 160, 0.1) 0%, rgba(9, 9, 11, 0) 50%)',
              'radial-gradient(ellipse 80% 80% at 80% 70%, rgba(61, 232, 160, 0.15) 0%, rgba(9, 9, 11, 0) 50%)',
              'radial-gradient(ellipse 80% 80% at 20% 50%, rgba(61, 232, 160, 0.15) 0%, rgba(9, 9, 11, 0) 50%)',
            ],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-20">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <h1 className="font-serif text-4xl font-light text-white mb-2">Your Dashboard</h1>
          <p className="text-[#636380]">Track your saved projects and site visit bookings</p>
        </motion.div>

        {/* Stats */}
        <motion.div
          className="grid grid-cols-3 gap-4 mb-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ staggerChildren: 0.1, delayChildren: 0.2 }}
        >
          {[
            { label: 'Saved Projects', value: savedProjects.length },
            { label: 'Site Visits Booked', value: visitRequests.length },
            { label: 'Member Since', value: 'Mar 2024' },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: i * 0.1 }}
              className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm hover:bg-white/[0.08] transition-colors"
            >
              <p className="text-[#636380] text-sm mb-2">{stat.label}</p>
              <p className="font-serif text-3xl text-[#3de8a0]">{stat.value}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Saved Projects */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mb-16"
        >
          <h2 className="font-serif text-2xl text-white mb-6">Saved Projects</h2>
          {savedProjects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {savedProjects.map((project, i) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  className="bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:bg-white/[0.08] transition-colors cursor-pointer group"
                >
                  <div className="aspect-video bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center overflow-hidden relative">
                    <motion.div
                      className="absolute inset-0 bg-[#3de8a0]/10"
                      whileHover={{ scale: 1.05 }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="font-serif text-lg text-white mb-1">{project.name}</h3>
                    <p className="text-[#636380] text-sm mb-3">{project.builder}</p>
                    <div className="flex justify-between items-center">
                      <span className="text-[#3de8a0] font-medium">{project.price}</span>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        className="text-[#636380] hover:text-[#3de8a0] transition-colors"
                        onClick={() => {
                          setSavedProjects(savedProjects.filter(p => p.id !== project.id));
                        }}
                      >
                        ✕
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border border-white/10 rounded-xl">
              <p className="text-[#636380] mb-4">No saved projects yet</p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-2 bg-[#3de8a0]/20 text-[#3de8a0] rounded-lg hover:bg-[#3de8a0]/30 transition-colors"
              >
                Explore Projects
              </motion.button>
            </div>
          )}
        </motion.section>

        {/* Site Visits */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <h2 className="font-serif text-2xl text-white mb-6">Site Visit Bookings</h2>
          {visitRequests.length > 0 ? (
            <div className="space-y-3">
              {visitRequests.map((visit, i) => (
                <motion.div
                  key={visit.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/[0.08] transition-colors flex items-center justify-between"
                >
                  <div>
                    <h3 className="text-white font-medium">{visit.projectName}</h3>
                    <p className="text-[#636380] text-sm">{visit.builderName}</p>
                    <p className="text-[#636380] text-xs mt-1">{new Date(visit.visitDate).toLocaleDateString()}</p>
                  </div>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className={`px-4 py-2 rounded-full text-sm font-medium ${
                      visit.status === 'confirmed'
                        ? 'bg-[#3de8a0]/20 text-[#3de8a0]'
                        : visit.status === 'pending'
                        ? 'bg-yellow-500/20 text-yellow-300'
                        : 'bg-green-500/20 text-green-300'
                    }`}
                  >
                    {visit.status.charAt(0).toUpperCase() + visit.status.slice(1)}
                  </motion.div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border border-white/10 rounded-xl">
              <p className="text-[#636380] mb-4">No site visits booked yet</p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-2 bg-[#3de8a0]/20 text-[#3de8a0] rounded-lg hover:bg-[#3de8a0]/30 transition-colors"
              >
                Book a Visit
              </motion.button>
            </div>
          )}
        </motion.section>
      </div>
    </main>
  );
}
