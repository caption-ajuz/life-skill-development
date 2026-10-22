import express from 'express';
import Distribution from '../models/Distribution.js';
import Collection from '../models/Collection.js';
import MoneyTransfer from '../models/MoneyTransfer.js';
import Team from '../models/Team.js';
import User from '../models/User.js';
import { authMiddleware } from '../middleware/auth.js';
import { isValidObjectId } from '../utils/validation.js';

const router = express.Router();

router.use(authMiddleware);

// GET /api/reports/data - Filtered reports data for export & table view
router.get('/data', async (req, res) => {
  try {
    const { type = 'distribution', teamId, memberId, areaId, status, dateFrom, dateTo } = req.query;

    const query = {};

    // Role-based permission enforcement
    if (req.user.role === 'team_member') {
      query.memberId = req.user._id;
    } else if (req.user.role === 'team_leader') {
      const userTeamId = req.user.teamId ? (req.user.teamId._id || req.user.teamId) : null;
      query.teamId = userTeamId;
      if (memberId && isValidObjectId(memberId)) query.memberId = memberId;
    } else {
      if (teamId && isValidObjectId(teamId)) query.teamId = teamId;
      if (memberId && isValidObjectId(memberId)) query.memberId = memberId;
    }

    if (areaId && isValidObjectId(areaId)) query.areaId = areaId;
    if (status) query.status = status;

    if (dateFrom || dateTo) {
      const dateField = type === 'transfer' ? 'transferDate' : 'date';
      query[dateField] = {};
      if (dateFrom) query[dateField].$gte = new Date(dateFrom);
      if (dateTo) query[dateField].$lte = new Date(dateTo);
    }

    let records = [];

    if (type === 'distribution') {
      records = await Distribution.find(query)
        .populate('memberId', 'fullName phone')
        .populate('teamId', 'name')
        .populate('areaId', 'name district')
        .sort({ date: -1 })
        .limit(1000);
    } else if (type === 'collection') {
      records = await Collection.find(query)
        .populate('memberId', 'fullName phone')
        .populate('teamId', 'name')
        .populate('areaId', 'name district')
        .sort({ date: -1 })
        .limit(1000);
    } else if (type === 'transfer') {
      if (req.user.role === 'team_member') {
        query.fromUserId = req.user._id;
        delete query.memberId;
      }
      records = await MoneyTransfer.find(query)
        .populate('fromUserId', 'fullName phone role')
        .populate('teamId', 'name')
        .populate('confirmedBy', 'fullName')
        .sort({ transferDate: -1 })
        .limit(1000);
    }

    return res.json({ success: true, data: records, type });
  } catch (err) {
    console.error('Report data error:', err);
    return res.status(500).json({ success: false, error: 'Failed to generate report data.' });
  }
});

// GET /api/reports/whatsapp-summary - Readable WhatsApp-ready text summary
router.get('/whatsapp-summary', async (req, res) => {
  try {
    const today = new Date();
    const dateStr = today.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

    let summaryText = '';

    if (['super_admin', 'usthad'].includes(req.user.role)) {
      // Campaign-wide summary
      const [distAgg, colAgg, transAgg, teamCount] = await Promise.all([
        Distribution.aggregate([
          { $match: { status: 'active' } },
          { $group: { _id: null, total: { $sum: '$quantity' } } }
        ]),
        Collection.aggregate([
          { $match: { status: 'active' } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]),
        MoneyTransfer.aggregate([
          { $match: { status: 'confirmed' } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]),
        Team.countDocuments({ isActive: true })
      ]);

      const distributed = distAgg[0] ? distAgg[0].total : 0;
      const collected = colAgg[0] ? colAgg[0].total : 0;
      const transferred = transAgg[0] ? transAgg[0].total : 0;

      summaryText = `📊 *MARKAZUL HIDAYATHIL ISLAMIYYA*\n` +
        `*Calendar Camp — Campaign Summary*\n` +
        `📅 Date: ${dateStr}\n\n` +
        `👥 Active Teams: ${teamCount}\n` +
        `📦 Total Calendars Distributed: *${distributed}*\n` +
        `💰 Total Money Collected: *₹${collected.toLocaleString('en-IN')}*\n` +
        `✅ Confirmed Bank Transfers: *₹${transferred.toLocaleString('en-IN')}*\n` +
        `⏳ Pending Transfer/Handover: *₹${Math.max(0, collected - transferred).toLocaleString('en-IN')}*\n\n` +
        `_Report generated via Life Skill Course App_`;
    } else if (req.user.role === 'team_leader') {
      const userTeamId = req.user.teamId ? (req.user.teamId._id || req.user.teamId) : null;
      const team = await Team.findById(userTeamId);
      const teamName = team ? team.name : 'Team';

      const [distAgg, colAgg, transAgg] = await Promise.all([
        Distribution.aggregate([
          { $match: { teamId: userTeamId, status: 'active' } },
          { $group: { _id: null, total: { $sum: '$quantity' } } }
        ]),
        Collection.aggregate([
          { $match: { teamId: userTeamId, status: 'active' } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]),
        MoneyTransfer.aggregate([
          { $match: { teamId: userTeamId, status: 'confirmed' } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ])
      ]);

      const distributed = distAgg[0] ? distAgg[0].total : 0;
      const collected = colAgg[0] ? colAgg[0].total : 0;
      const transferred = transAgg[0] ? transAgg[0].total : 0;

      summaryText = `🏆 *TEAM REPORT — ${teamName.toUpperCase()}*\n` +
        `📅 Date: ${dateStr}\n\n` +
        `📦 Calendars Distributed: *${distributed}*\n` +
        `💰 Total Collections: *₹${collected.toLocaleString('en-IN')}*\n` +
        `✅ Confirmed Handed Over: *₹${transferred.toLocaleString('en-IN')}*\n` +
        `⏳ In Hand Pending Handover: *₹${Math.max(0, collected - transferred).toLocaleString('en-IN')}*\n\n` +
        `_Life Skill Course — Markazul Hidayathil Islamiyya_`;
    } else {
      // Member summary
      const [distAgg, colAgg, transAgg] = await Promise.all([
        Distribution.aggregate([
          { $match: { memberId: req.user._id, status: 'active' } },
          { $group: { _id: null, total: { $sum: '$quantity' } } }
        ]),
        Collection.aggregate([
          { $match: { memberId: req.user._id, status: 'active' } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]),
        MoneyTransfer.aggregate([
          { $match: { fromUserId: req.user._id, status: 'confirmed' } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ])
      ]);

      const distributed = distAgg[0] ? distAgg[0].total : 0;
      const collected = colAgg[0] ? colAgg[0].total : 0;
      const transferred = transAgg[0] ? transAgg[0].total : 0;

      summaryText = `👤 *MY DAILY ACTIVITY REPORT*\n` +
        `*Name:* ${req.user.fullName}\n` +
        `📅 Date: ${dateStr}\n\n` +
        `📦 Distributed Today: *${distributed}*\n` +
        `💰 Collected: *₹${collected.toLocaleString('en-IN')}*\n` +
        `✅ Transferred: *₹${transferred.toLocaleString('en-IN')}*\n` +
        `⏳ Balance with me: *₹${Math.max(0, collected - transferred).toLocaleString('en-IN')}*\n\n` +
        `_Markazul Hidayathil Islamiyya Calendar Camp_`;
    }

    return res.json({ success: true, text: summaryText });
  } catch (err) {
    console.error('WhatsApp summary error:', err);
    return res.status(500).json({ success: false, error: 'Failed to generate summary.' });
  }
});

// GET /api/reports/thank-you - Prepare donor thank-you message
router.get('/thank-you', (req, res) => {
  const { donorName, amount, phone } = req.query;
  const amt = amount ? `₹${parseFloat(amount).toLocaleString('en-IN')}` : '';
  const name = donorName ? ` ${donorName.trim()}` : '';

  const message = `Assalamu Alaikum${name},\n\n` +
    `Thank you very much for contributing ${amt} towards the Markazul Hidayathil Islamiyya Calendar Campaign.\n\n` +
    `May Allah accept your noble contribution and reward you with abundance.\n\n` +
    `_Markazul Hidayathil Islamiyya, Kombam_`;

  return res.json({
    success: true,
    phone: phone || '',
    message,
    whatsappUrl: `https://api.whatsapp.com/send?${phone ? `phone=${encodeURIComponent(phone)}&` : ''}text=${encodeURIComponent(message)}`
  });
});

export default router;
