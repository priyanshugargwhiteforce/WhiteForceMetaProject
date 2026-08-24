const { pool } = require('../../config/db');

/**
 * Purchase Order (PO) Database Model
 * Handles MySQL table creation and CRUD queries for table 'po'
 */
const POModel = {
  /**
   * Create table 'po' if it does not exist
   */
  async createTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS po (
        id INT AUTO_INCREMENT PRIMARY KEY,
        po_no VARCHAR(100) NOT NULL UNIQUE,
        po_date VARCHAR(50) NOT NULL,
        pay_terms VARCHAR(100) DEFAULT 'Net 30 Days',
        req_by VARCHAR(255) DEFAULT '',
        buyer_name VARCHAR(255) DEFAULT 'HAPPY SQUARE OUTSOURCING SERVICES LIMITED',
        sub_comp VARCHAR(255) DEFAULT '',
        comp_addr1 TEXT,
        comp_gst VARCHAR(100) DEFAULT '',
        comp_phone VARCHAR(50) DEFAULT '',
        vendor_name VARCHAR(255) DEFAULT '',
        vendor_addr TEXT,
        vendor_gst VARCHAR(100) DEFAULT '',
        vendor_email VARCHAR(255) DEFAULT '',
        ship_to_comp VARCHAR(255) DEFAULT '',
        ship_to_addr TEXT,
        ship_to_contact VARCHAR(255) DEFAULT '',
        delivery_date VARCHAR(100) DEFAULT '',
        currency VARCHAR(10) DEFAULT '₹',
        subtotal DECIMAL(15, 2) DEFAULT 0.00,
        tax_input DECIMAL(15, 2) DEFAULT 0.00,
        fees_input DECIMAL(15, 2) DEFAULT 0.00,
        total_val DECIMAL(15, 2) DEFAULT 0.00,
        items JSON,
        prep_by_name VARCHAR(255) DEFAULT 'Priyanshu Garg',
        auth_sign_name VARCHAR(255) DEFAULT 'CEO Shailesh Rajpal',
        status VARCHAR(50) DEFAULT 'ISSUED',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    await pool.query(query);
    console.log(' - po table created/verified');
  },

  /**
   * Create a new PO record
   */
  async create(poData) {
    const {
      poNo,
      poDate,
      payTerms = 'Net 30 Days',
      reqBy = '',
      buyerName = 'HAPPY SQUARE OUTSOURCING SERVICES LIMITED',
      subComp = '',
      compAddr1 = '',
      compGST = '',
      compPhone = '',
      vendorName = '',
      vendorAddr = '',
      vendorGST = '',
      vendorEmail = '',
      shipToComp = '',
      shipToAddr = '',
      shipToContact = '',
      deliveryDate = '',
      currency = '₹',
      subtotal = 0.00,
      taxInput = 0.00,
      feesInput = 0.00,
      totalVal = 0.00,
      items = [],
      prepByName = 'Priyanshu Garg',
      authSignName = 'CEO Shailesh Rajpal',
      status = 'ISSUED'
    } = poData;

    const parseNum = (val) => {
      if (val === undefined || val === null || val === '') return 0.00;
      const clean = String(val).replace(/[^0-9.-]/g, '');
      const n = parseFloat(clean);
      return isNaN(n) ? 0.00 : n;
    };

    const numSubtotal = parseNum(subtotal);
    const numTax = parseNum(taxInput);
    const numFees = parseNum(feesInput);
    const numTotal = parseNum(totalVal);

    const itemsJson = typeof items === 'string' ? items : JSON.stringify(items || []);

    const query = `
      INSERT INTO po (
        po_no, po_date, pay_terms, req_by, buyer_name, sub_comp, comp_addr1, comp_gst, comp_phone,
        vendor_name, vendor_addr, vendor_gst, vendor_email, ship_to_comp, ship_to_addr, ship_to_contact,
        delivery_date, currency, subtotal, tax_input, fees_input, total_val, items, prep_by_name,
        auth_sign_name, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      poNo, poDate, payTerms, reqBy, buyerName, subComp, compAddr1, compGST, compPhone,
      vendorName, vendorAddr, vendorGST, vendorEmail, shipToComp, shipToAddr, shipToContact,
      deliveryDate, currency, numSubtotal, numTax, numFees, numTotal, itemsJson, prepByName,
      authSignName, status
    ];

    const [result] = await pool.query(query, values);
    return this.findById(result.insertId);
  },

  /**
   * Find all POs with optional filtering
   */
  async findAll({ search, status } = {}) {
    let query = 'SELECT * FROM po WHERE 1=1';
    const params = [];

    if (search) {
      query += ' AND (po_no LIKE ? OR vendor_name LIKE ? OR buyer_name LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY id DESC';

    const [rows] = await pool.query(query, params);
    return rows.map(r => this._formatRow(r));
  },

  /**
   * Generates the next sequential PO Number based on current Year & Month (e.g. PO202608-001, PO202608-002)
   */
  async getNextPONumber() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `PO${yyyy}${mm}-`;

    const query = `SELECT po_no FROM po WHERE po_no LIKE ? ORDER BY id DESC LIMIT 100`;
    const [rows] = await pool.query(query, [`${prefix}%`]);

    let maxSeq = 0;
    if (rows && rows.length > 0) {
      for (const row of rows) {
        const parts = row.po_no.split('-');
        if (parts.length >= 2) {
          const seqNum = parseInt(parts[parts.length - 1], 10);
          if (!isNaN(seqNum) && seqNum > maxSeq) {
            maxSeq = seqNum;
          }
        }
      }
    }

    const nextSeq = String(maxSeq + 1).padStart(3, '0');
    return `${prefix}${nextSeq}`;
  },

  /**
   * Find PO by ID or PO Number
   */
  async findById(idOrPoNo) {
    const isNumeric = !isNaN(idOrPoNo);
    const query = isNumeric 
      ? 'SELECT * FROM po WHERE id = ?' 
      : 'SELECT * FROM po WHERE po_no = ?';
    
    const [rows] = await pool.query(query, [idOrPoNo]);
    if (!rows || rows.length === 0) return null;
    return this._formatRow(rows[0]);
  },

  /**
   * Update an existing PO
   */
  async update(idOrPoNo, updateData) {
    const existing = await this.findById(idOrPoNo);
    if (!existing) return null;

    const fields = [];
    const values = [];

    const fieldMapping = {
      poNo: 'po_no',
      poDate: 'po_date',
      payTerms: 'pay_terms',
      reqBy: 'req_by',
      buyerName: 'buyer_name',
      subComp: 'sub_comp',
      compAddr1: 'comp_addr1',
      compGST: 'comp_gst',
      compPhone: 'comp_phone',
      vendorName: 'vendor_name',
      vendorAddr: 'vendor_addr',
      vendorGST: 'vendor_gst',
      vendorEmail: 'vendor_email',
      shipToComp: 'ship_to_comp',
      shipToAddr: 'ship_to_addr',
      shipToContact: 'ship_to_contact',
      deliveryDate: 'delivery_date',
      currency: 'currency',
      subtotal: 'subtotal',
      taxInput: 'tax_input',
      feesInput: 'fees_input',
      totalVal: 'total_val',
      items: 'items',
      prepByName: 'prep_by_name',
      authSignName: 'auth_sign_name',
      status: 'status'
    };

    for (const [jsKey, dbCol] of Object.entries(fieldMapping)) {
      if (updateData[jsKey] !== undefined) {
        fields.push(`${dbCol} = ?`);
        let val = updateData[jsKey];
        if (jsKey === 'items' && typeof val !== 'string') {
          val = JSON.stringify(val);
        } else if (['subtotal', 'taxInput', 'feesInput', 'totalVal'].includes(jsKey)) {
          val = parseFloat(String(val).replace(/[^0-9.-]/g, '')) || 0.00;
        }
        values.push(val);
      }
    }

    if (fields.length === 0) return existing;

    values.push(existing.id);
    const query = `UPDATE po SET ${fields.join(', ')} WHERE id = ?`;

    await pool.query(query, values);
    return this.findById(existing.id);
  },

  /**
   * Delete PO by ID or PO Number
   */
  async delete(idOrPoNo) {
    const existing = await this.findById(idOrPoNo);
    if (!existing) return false;

    await pool.query('DELETE FROM po WHERE id = ?', [existing.id]);
    return true;
  },

  /**
   * Helper to format DB row
   */
  _formatRow(row) {
    if (!row) return null;
    let parsedItems = [];
    try {
      parsedItems = typeof row.items === 'string' ? JSON.parse(row.items) : (row.items || []);
    } catch (e) {
      parsedItems = [];
    }

    return {
      id: row.id,
      poNo: row.po_no,
      poDate: row.po_date,
      payTerms: row.pay_terms,
      reqBy: row.req_by,
      buyerName: row.buyer_name,
      subComp: row.sub_comp,
      compAddr1: row.comp_addr1,
      compGST: row.comp_gst,
      compPhone: row.comp_phone,
      vendorName: row.vendor_name,
      vendorAddr: row.vendor_addr,
      vendorGST: row.vendor_gst,
      vendorEmail: row.vendor_email,
      shipToComp: row.ship_to_comp,
      shipToAddr: row.ship_to_addr,
      shipToContact: row.ship_to_contact,
      deliveryDate: row.delivery_date,
      currency: row.currency,
      subtotal: parseFloat(row.subtotal) || 0.00,
      taxInput: parseFloat(row.tax_input) || 0.00,
      feesInput: parseFloat(row.fees_input) || 0.00,
      totalVal: parseFloat(row.total_val) || 0.00,
      items: parsedItems,
      prepByName: row.prep_by_name,
      authSignName: row.auth_sign_name,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
};

module.exports = POModel;
