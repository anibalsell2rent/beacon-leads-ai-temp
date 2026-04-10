import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database.config";

export class CrmSellers extends Model {
  public id!: number;
  public first_name!: string;
  public last_name!: string;
  public phone!: string;
  public email!: string;
  public created_at!: Date;
  public lead_id!: string;
  public mobile!: string;
  public alt_phone!: string;
  public alt_email!: string;
  public preferred_contact_method!: string;
  public best_time_to_call!: string;
  public language!: string;
  public mailing_address!: string;
  public mailing_city!: string;
  public mailing_state!: string;
  public mailing_zip!: string;
  public second_seller_first_name!: string;
  public second_seller_last_name!: string;
  public second_seller_email!: string;
  public second_seller_phone!: string;
  public second_seller_relationship!: string;
  public date_of_birth!: Date;
  public age!: number;
  public gender!: string;
  public occupation!: string;
  public employer!: string;
  public employment_status!: string;
  public years_employed!: number;
  public military_status!: string;
  public is_veteran!: boolean;
  public relationship_to_property!: string;
  public ownership_type!: string;
  public motivation!: string;
  public urgency!: string;
  public reason_for_selling!: string;
  public timeline_flexibility!: string;
  public desired_timeline!: string;
  public wants_or_needs!: string;
  public ultimate_seller_goals!: string;
  public need_to_sell_by!: Date;
  public current_marriage_status!: string;
  public spouse_name!: string;
  public divorce_status!: string;
  public divorce_attorney!: string;
  public probate_status!: string;
  public estate_attorney!: string;
  public has_power_of_attorney!: boolean;
  public poa_name!: string;
  public poa_relationship!: string;
  public criminal_records!: boolean;
  public criminal_records_details!: string;
  public asking_price!: number;
  public minimum_acceptable_price!: number;
  public seller_annual_income!: number;
  public total_household_income!: number;
  public credit_score_range!: string;
  public monthly_debts!: number;
  public debt_to_income_ratio!: number;
  public is_in_bankruptcy!: boolean;
  public bankruptcy_type!: string;
  public bankruptcy_status!: string;
  public bankruptcy_discharge_date!: Date;
  public sales_proceeds_needed!: number;
  public equity_needed!: number;
  public years_lived_at_property!: number;
  public occupants_count!: number;
  public occupant_details!: string;
  public has_pets!: boolean;
  public pet_types!: string;
  public pet_count!: number;
  public desired_leaseback_period!: number;
  public max_monthly_rent!: number;
  public preferred_move_out_date!: Date;
  public open_to_leaseback!: boolean;
  public leaseback_terms!: string;
  public idenfy_status!: string;
  public idenfy_session_id!: string;
  public opt_out_dnc!: boolean;
  public text_opt_out!: boolean;
  public email_opt_out!: boolean;
  public notes!: string;
  public story!: string;
  public communication_notes!: string;
  public updated_at!: Date;
  public zoho_contact_id!: string;
  public property_id!: string;
}

CrmSellers.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    first_name: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    last_name: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    phone: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    email: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lead_id: {
      type: DataTypes.UUID,
      unique: true,
      allowNull: true,
    },
    mobile: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    alt_phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    alt_email: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    preferred_contact_method: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    best_time_to_call: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    language: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    mailing_address: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    mailing_city: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    mailing_state: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    mailing_zip: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    second_seller_first_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    second_seller_last_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    second_seller_email: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    second_seller_phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    second_seller_relationship: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    date_of_birth: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    age: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    gender: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    occupation: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    employer: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    employment_status: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    years_employed: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    military_status: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    is_veteran: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    relationship_to_property: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    ownership_type: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    motivation: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    urgency: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    reason_for_selling: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    timeline_flexibility: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    desired_timeline: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    wants_or_needs: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    ultimate_seller_goals: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    need_to_sell_by: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    current_marriage_status: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    spouse_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    divorce_status: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    divorce_attorney: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    probate_status: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    estate_attorney: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    has_power_of_attorney: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    poa_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    poa_relationship: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    criminal_records: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    criminal_records_details: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    asking_price: {
      type: DataTypes.DECIMAL,
      allowNull: true,
    },
    minimum_acceptable_price: {
      type: DataTypes.DECIMAL,
      allowNull: true,
    },
    seller_annual_income: {
      type: DataTypes.DECIMAL,
      allowNull: true,
    },
    total_household_income: {
      type: DataTypes.DECIMAL,
      allowNull: true,
    },
    credit_score_range: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    monthly_debts: {
      type: DataTypes.DECIMAL,
      allowNull: true,
    },
    debt_to_income_ratio: {
      type: DataTypes.DECIMAL,
      allowNull: true,
    },
    is_in_bankruptcy: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    bankruptcy_type: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    bankruptcy_status: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    bankruptcy_discharge_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    sales_proceeds_needed: {
      type: DataTypes.DECIMAL,
      allowNull: true,
    },
    equity_needed: {
      type: DataTypes.DECIMAL,
      allowNull: true,
    },
    years_lived_at_property: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    occupants_count: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    occupant_details: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    has_pets: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    pet_types: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    pet_count: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    desired_leaseback_period: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    max_monthly_rent: {
      type: DataTypes.DECIMAL,
      allowNull: true,
    },
    preferred_move_out_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    open_to_leaseback: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    leaseback_terms: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    idenfy_status: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    idenfy_session_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    opt_out_dnc: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    text_opt_out: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    email_opt_out: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    story: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    communication_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    zoho_contact_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    property_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "crm_sellers",
    timestamps: false,
  }
);
